use actix::{Actor, Addr, StreamHandler, AsyncContext, Handler, Message, Context, Recipient};
use actix_web::{web, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use serde::{Deserialize};
use serde_json::json;

// Top-level imports and actor declarations stay the same

// WebSocket Manager
pub struct WebSocketManager {
    sessions: Arc<Mutex<HashMap<String, Recipient<WebRTCMessage>>>>,
    rooms: Arc<Mutex<HashMap<String, HashSet<String>>>>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            rooms: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Actor for WebSocketManager {
    type Context = Context<Self>;
}

// WebSocket Session
pub struct WebSocketSession {
    id: Option<String>, // Changed to Option<String> since it's assigned later
    manager: Addr<WebSocketManager>,
    room_id: String,
}

impl Actor for WebSocketSession {
    type Context = ws::WebsocketContext<Self>;

    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        if let Some(ref id) = self.id {
            println!("Session {} stopping from room {}", id, self.room_id);
            self.manager.do_send(UnregisterSession {
                id: id.clone(),
                room_id: self.room_id.clone(),
            });
        }
        actix::Running::Stop
    }
}

// Messages
#[derive(Message)]
#[rtype(result = "()")]
pub struct RegisterSession {
    pub id: String,
    pub addr: Recipient<WebRTCMessage>,
    pub room_id: String,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct UnregisterSession {
    pub id: String,
    pub room_id: String,
}

#[derive(Clone, Message, Debug)]
#[rtype(result = "()")]
pub struct WebRTCMessage {
    pub from: String,
    pub to: Option<String>,
    pub room_id: String,
    pub content: String,
}

// Handlers for Manager
impl Handler<RegisterSession> for WebSocketManager {
    type Result = ();

    fn handle(&mut self, msg: RegisterSession, _: &mut Self::Context) {
        println!("Registering session {} to room {}", msg.id, msg.room_id);
        let mut sessions = self.sessions.lock().unwrap();
        let mut rooms = self.rooms.lock().unwrap();

        sessions.insert(msg.id.clone(), msg.addr);
        rooms.entry(msg.room_id.clone()).or_insert_with(HashSet::new).insert(msg.id.clone());

        let others = rooms.get(&msg.room_id).unwrap().clone();
        for peer_id in others.into_iter().filter(|id| id != &msg.id) {
            if let Some(addr) = sessions.get(&peer_id) {
                let content = json!({ "type": "new-user", "from": msg.id }).to_string();
                println!("Notifying session {} about new user {}", peer_id, msg.id);
                let _ = addr.try_send(WebRTCMessage {
                    from: msg.id.clone(),
                    to: Some(peer_id),
                    room_id: msg.room_id.clone(),
                    content,
                });
            }
        }
    }
}

impl Handler<UnregisterSession> for WebSocketManager {
    type Result = ();

    fn handle(&mut self, msg: UnregisterSession, _: &mut Self::Context) {
        println!("Unregistering session {} from room {}", msg.id, msg.room_id);
        self.sessions.lock().unwrap().remove(&msg.id);
        if let Some(room) = self.rooms.lock().unwrap().get_mut(&msg.room_id) {
            room.remove(&msg.id);
        }
    }
}

impl Handler<WebRTCMessage> for WebSocketManager {
    type Result = ();

    fn handle(&mut self, msg: WebRTCMessage, _: &mut Self::Context) {
        let msg_clone = msg.clone();
        println!("Routing message from {} to {:?} in room {}", msg.from, msg.to, msg.room_id);
        if let Some(to_id) = msg.to {
            if let Some(addr) = self.sessions.lock().unwrap().get(&to_id) {
                let _ = addr.try_send(msg_clone);
            }
        }
    }
}

// Client message types
#[derive(Deserialize)]
struct ClientSignal {
    r#type: String,
    from: String,
    to: Option<String>,
    room_id: String,
    content: String,
}

#[derive(Deserialize)]
struct JoinMessage {
    r#type: String,
    room: String,
    peer_id: String,
}

// WebSocket message handling
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocketSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        if let Ok(ws::Message::Text(text)) = msg {
            println!("Received WebSocket text message: {}", text);

            if let Ok(join) = serde_json::from_str::<JoinMessage>(&text) {
                println!("Join message received: peerId = {}, room = {}", join.peer_id, join.room);
                self.id = Some(join.peer_id.clone());

                self.manager.do_send(RegisterSession {
                    id: join.peer_id.clone(),
                    addr: ctx.address().recipient(),
                    room_id: join.room.clone(),
                });
                self.room_id = join.room;
            } else if let Ok(parsed) = serde_json::from_str::<ClientSignal>(&text) {
                self.manager.do_send(WebRTCMessage {
                    from: parsed.from,
                    to: parsed.to,
                    room_id: parsed.room_id,
                    content: parsed.content,
                });
            }
        }
    }
}

impl Handler<WebRTCMessage> for WebSocketSession {
    type Result = ();

    fn handle(&mut self, msg: WebRTCMessage, ctx: &mut ws::WebsocketContext<Self>) {
        println!("Session {:?} sending message: {}", self.id, msg.content);
        ctx.text(msg.content);
    }
}

// WebSocket route
pub async fn ws_index(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<(String,)>,
    manager: web::Data<Addr<WebSocketManager>>,
) -> HttpResponse {
    let (room_id,) = path.into_inner();
    println!("Establishing WebSocket connection in room {}", room_id);

    match ws::start(
        WebSocketSession {
            id: None,
            manager: manager.get_ref().clone(),
            room_id,
        },
        &req,
        stream,
    ) {
        Ok(resp) => resp,
        Err(err) => {
            eprintln!("WebSocket start error: {:?}", err);
            HttpResponse::InternalServerError().finish()
        }
    }
}

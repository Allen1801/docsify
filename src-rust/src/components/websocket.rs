use actix::{Actor, Addr, StreamHandler, AsyncContext, Handler, Message, Context, Recipient};
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use std::collections::{HashMap, HashSet};
use std::path;
use std::sync::{Arc, Mutex};
use actix::prelude::*;

// ✅ WebSocket Manager (Actor)
pub struct WebSocketManager {
    sessions: Arc<Mutex<HashMap<usize, Recipient<WebRTCMessage>>>>,
    rooms: Arc<Mutex<HashMap<String, HashSet<usize>>>>, // Room -> Set of session IDs
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            rooms: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ✅ Implement Actor for WebSocketManager
impl Actor for WebSocketManager {
    type Context = Context<Self>;
}

// Define a WebSocket session (Actor)
pub struct WebSocketSession {
    id: usize,
    manager: Addr<WebSocketManager>,
    room_id: String,
}

impl Actor for WebSocketSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let addr = ctx.address().recipient();
        self.manager
            .send(RegisterSession { id: self.id, addr, room_id: self.room_id.clone() })
            .into_actor(self)
            .then(|_, _, _| actix::fut::ready(()))
            .wait(ctx);
    }

    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        self.manager.do_send(UnregisterSession { id: self.id, room_id: self.room_id.clone() });
        actix::Running::Stop
    }
}

// ✅ Messages for WebRTC Signaling
#[derive(Message)]
#[rtype(result = "()")]
pub struct RegisterSession {
    pub id: usize,
    pub addr: Recipient<WebRTCMessage>,
    pub room_id: String,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct UnregisterSession {
    pub id: usize,
    pub room_id: String,
}

#[derive(Message, Debug)]
#[rtype(result = "()")]
pub struct WebRTCMessage {
    pub sender_id: usize,
    pub room_id: String,
    pub content: String, // Offer, Answer, ICE candidates
}

// ✅ Handle WebSocketManager actions
impl Handler<RegisterSession> for WebSocketManager {
    type Result = ();

    fn handle(&mut self, msg: RegisterSession, _: &mut Self::Context) {
        let mut sessions = self.sessions.lock().unwrap();
        let mut rooms = self.rooms.lock().unwrap();

        println!("✅ Registering session: {} in room {}", msg.id, msg.room_id);

        sessions.insert(msg.id, msg.addr);
        rooms.entry(msg.room_id.clone())
            .or_insert_with(HashSet::new)
            .insert(msg.id);

        println!("📌 Current sessions: {:?}", sessions.keys());
        println!("📌 Current rooms: {:?}", rooms);
    }
}

impl Handler<UnregisterSession> for WebSocketManager {
    type Result = ();

    fn handle(&mut self, msg: UnregisterSession, _: &mut Self::Context) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(users) = rooms.get_mut(&msg.room_id) {
            users.remove(&msg.id);
        }
    }
}

impl Handler<WebRTCMessage> for WebSocketManager {
    type Result = ();

    fn handle(&mut self, msg: WebRTCMessage, _: &mut Self::Context) {
        let rooms = self.rooms.lock().unwrap();
        println!("📩 Received WebRTCMessage: {:?}", msg);

        if let Some(users) = rooms.get(&msg.room_id) {
            for &user_id in users {
                if user_id != msg.sender_id {
                    println!("📤 Forwarding message to user_id: {}", user_id);

                    if let Some(addr) = self.sessions.lock().unwrap().get(&user_id) {
                        addr.try_send(WebRTCMessage {
                            sender_id: msg.sender_id,
                            room_id: msg.room_id.clone(),
                            content: msg.content.clone(),
                        }).unwrap_or_else(|e| {
                            println!("❌ Error forwarding message to {}: {:?}", user_id, e);
                        });
                    } else {
                        println!("❌ No WebSocket session found for user {}", user_id);
                    }
                }
            }
        } else {
            println!("⚠️ Room {} not found", msg.room_id);
        }
    }
}

// ✅ Handle WebSocket messages in WebSocketSession
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocketSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, _ctx: &mut Self::Context) {
        if let Ok(ws::Message::Text(text)) = msg {
            println!("Received WebSocket message: {}", text); // ✅ Log WebSocket message

            self.manager.do_send(WebRTCMessage {
                sender_id: self.id,
                room_id: self.room_id.clone(),
                content: text.to_string(),
            });
        }
    }
}

// ✅ Handle WebRTC messages in WebSocketSession
impl Handler<WebRTCMessage> for WebSocketSession {
    type Result = ();

    fn handle(&mut self, msg: WebRTCMessage, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.text(msg.content);
    }
}

// ✅ WebSocket route
pub async fn ws_index(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<(String,)>,
    manager: web::Data<Addr<WebSocketManager>>,
) -> HttpResponse {
    let id = rand::random::<usize>();
    let (room_id,) = path.into_inner(); // Replace with dynamic room handling
    println!("🛜 New WebSocket Connection in Room: {:?}", room_id);

    ws::start(
        WebSocketSession { id, manager: manager.get_ref().clone(), room_id },
        &req,
        stream,
    )
    .unwrap()
}

// // ✅ Start Actix Web Server
// #[actix_web::main]
// async fn main() -> std::io::Result<()> {
//     let manager = WebSocketManager::new().start();

//     HttpServer::new(move || {
//         App::new()
//             .app_data(web::Data::new(manager.clone()))
//             .route("/ws", web::get().to(ws_index))
//     })
//     .bind("127.0.0.1:8080")?
//     .run()
//     .await
// }

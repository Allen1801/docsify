use actix::{Actor, Addr, StreamHandler, AsyncContext, Handler, Message, Context, Recipient, WrapFuture};
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use actix::ActorFutureExt;
use actix::ContextFutureSpawner;

// ✅ WebSocket Manager (Actor)
pub struct ChatManager {
    sessions: Arc<Mutex<HashMap<usize, Recipient<TextMessage>>>>,
}

impl ChatManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ✅ Fix: Implement Actor for ChatManager
impl Actor for ChatManager {
    type Context = Context<Self>;
}

// Define a WebSocket session (Actor)
struct WebSocketSession {
    id: usize,
    manager: Addr<ChatManager>,
}

impl Actor for WebSocketSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let addr = ctx.address().recipient();
        self.manager
            .send(RegisterSession { id: self.id, addr })
            .into_actor(self)
            .then(|_, _, _| actix::fut::ready(()))
            .wait(ctx);
    }

    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        self.manager.do_send(UnregisterSession { id: self.id });
        actix::Running::Stop
    }
}

// Messages for managing WebSocket connections
#[derive(Message)]
#[rtype(result = "()")]
struct RegisterSession {
    id: usize,
    addr: Recipient<TextMessage>,
}

#[derive(Message)]
#[rtype(result = "()")]
struct UnregisterSession {
    id: usize,
}

#[derive(Message)]
#[rtype(result = "()")]
struct TextMessage(pub String);

// Implement handlers for ChatManager
impl Handler<RegisterSession> for ChatManager {
    type Result = ();

    fn handle(&mut self, msg: RegisterSession, _: &mut Self::Context) {
        self.sessions.lock().unwrap().insert(msg.id, msg.addr);
    }
}

impl Handler<UnregisterSession> for ChatManager {
    type Result = ();

    fn handle(&mut self, msg: UnregisterSession, _: &mut Self::Context) {
        self.sessions.lock().unwrap().remove(&msg.id);
    }
}

impl Handler<TextMessage> for ChatManager {
    type Result = ();

    fn handle(&mut self, msg: TextMessage, _: &mut Self::Context) {
        let sessions = self.sessions.lock().unwrap();
        for (_id, addr) in sessions.iter() {
            let _ = addr.do_send(TextMessage(msg.0.clone()));
        }
    }
}

// Implement message handling in WebSocketSession
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocketSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        if let Ok(ws::Message::Text(text)) = msg {
            println!("Received: {}", text);
            self.manager.do_send(TextMessage(text.to_string()));
        }
    }
}

impl Handler<TextMessage> for WebSocketSession {
    type Result = ();

    fn handle(&mut self, msg: TextMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

// WebSocket route
pub async fn ws_chat(
    req: HttpRequest,
    stream: web::Payload,
    manager: web::Data<Addr<ChatManager>>,
) -> HttpResponse {
    let id = rand::random::<usize>();
    ws::start(
        WebSocketSession {
            id,
            manager: manager.get_ref().clone(),
        },
        &req,
        stream,
    )
    .unwrap()
}

// #[actix_web::main]
// async fn main() -> std::io::Result<()> {
//     let manager = ChatManager::new().start();

//     HttpServer::new(move || {
//         App::new()
//             .app_data(web::Data::new(manager.clone()))
//             .route("/ws", web::get().to(ws_chat))
//     })
//     .bind("127.0.0.1:8080")?
//     .run()
//     .await
// }

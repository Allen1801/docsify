use std::vec;   
use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use actix::Actor;

mod components;
mod structs;

//use crate::components::api::handle_chat;
use crate::components::websocket::{ws_index, WebSocketManager};
//use crate::components::userchat::{ws_chat, ChatManager};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let server = WebSocketManager::new().start();
    //let chat_server = ChatManager::new().start();


    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            // .allowed_origin("http://127.0.0.1:5173")
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec!["Content-Type"]);

        App::new()
            .wrap(cors) // 🔥 Enable CORS
            .app_data(web::Data::new(server.clone()))
            .route("/ws/{room_id}", web::get().to(ws_index)) // WebSocket route
            //.app_data(web::Data::new(chat_server.clone()))
            //.route("/chat", web::post().to(handle_chat)) // Chat API
            //.route("/chat", web::get().to(ws_chat)) // WebSocket route
    })
    .bind(("127.0.0.1", 6969))?
    .run()
    .await
}
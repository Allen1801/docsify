use std::vec;   
use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use actix::Actor;
use dotenv::dotenv;
mod components;
mod structs;

//use crate::components::api::handle_chat;
use crate::components::websocket::{ws_index, WebSocketManager};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let server = WebSocketManager::new().start();
    //let chat_server = ChatManager::new().start();

    HttpServer::new(move || {
        let cors = Cors::default()
            // .allow_any_origin()
            .allowed_origin("https://docsio.vercel.app")
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec!["Content-Type"])
            .supports_credentials();

        App::new()
            .wrap(cors) // 🔥 Enable CORS
            .app_data(web::Data::new(server.clone()))
            .route("/ws/{room_id}", web::get().to(ws_index)) // WebSocket route
            //.app_data(web::Data::new(chat_server.clone()))
            //.route("/chat", web::post().to(handle_chat)) // Chat API
            //.route("/chat", web::get().to(ws_chat)) // WebSocket route
    })
    .bind(("https://docsify-pw6s.onrender.com", 6969))?
    .run()
    .await
}
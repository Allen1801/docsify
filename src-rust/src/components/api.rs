use actix_web::{web, Responder, HttpResponse};
use reqwest::Client;

use crate::structs::aichat::{ChatRequest, ChatResponse};

pub async fn handle_chat(chat_req: web::Json<ChatRequest>) -> impl Responder {
    // Local Vec<String> for history
    let mut conversation_history = Vec::new();
    
    conversation_history.push(format!("User: {}", chat_req.message));
    let response = query(&chat_req.message, &conversation_history).await;
    conversation_history.push(format!("AI: {}", response));

    HttpResponse::Ok().json(ChatResponse { response })
}

pub async fn query(input: &str, history: &[String]) -> String {
    let client = Client::new();
    println!(
        " ***----- HISTORY START -----*** \n {} \n ***----- HISTORY END -----*** \n\n\n ***----- NEW CONVERSATION -----*** \n User: {}\n AI: \n ***----- NEW CONVERSATION -----***",
        history.join("\n"),
        input
    );

    let response = client
        .post("http://192.168.1.21:11434/api/generate")
        .json(&serde_json::json!({
            "model": "deepseek-r1:32b",
            "prompt": format!(
                "Conversation history:\n{}\nUser: {}\nAI:", 
                history.join("\n"), 
                input
            ),
            "stream": false
        }))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let text = resp.text().await.unwrap_or_else(|_| "Invalid response".to_string());
            let json_resp: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
            json_resp["response"].as_str().unwrap_or("Error processing request").to_string()
        }
        Err(err) => {
            eprintln!("Request Error: {:?}", err);
            "Error processing request".to_string()
        }
    }
}


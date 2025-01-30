
import * as vscode from 'vscode';
import ollama from 'ollama';

export function activate(context: vscode.ExtensionContext){
	const disposable = vscode.commands.registerCommand('offline-chat.start', () => {
		const panel = vscode.window.createWebviewPanel(
			'chat- Ollama',
			'Ollma chat',
			vscode.ViewColumn.One,
			{enableScripts: true}
		);
		panel.webview.html = getWebViewContent();

		panel.webview.onDidReceiveMessage(async (message:any)=>{
			if(message.command == 'ask'){
				const userPrompt = message.text;
				let response ='';

				try{
					const streamResponse = await ollama.chat({
						model: 'llama3.2',
						messages:[{role: 'user', content: userPrompt}],
						stream: true
					})

					for await (const part of streamResponse){
						
							response += message.content;
							panel.webview.postMessage({command:'response', text: response});
						
					}
				}catch(err){}
			}
		});

	});
}


export function deactivate(){}

function getWebViewContent(): string {
	return `
	  <!DOCTYPE html>
	  <html lang="en">
	  <head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Ollama Chat</title>
		<style>
		  body { padding: 20px; }
		  #chat-container { margin: 20px 0; }
		  #prompt { width: 100%; padding: 8px; margin-bottom: 10px; }
		  #response { margin-top: 20px; }
		</style>
	  </head>
	  <body>
		<h1>Welcome to Ollama Chat</h1>
		<div id="chat-container">
		  <textarea id="prompt" placeholder="Type your message..."></textarea>
		  <button id="askBtn">Send</button>
		  <div id="response"></div>
		</div>
		<script>
		  const vscode = acquireVsCodeApi();
  
		  document.getElementById('askBtn').addEventListener('click', () => {
			const text = document.getElementById('prompt').value;
			if (text.trim()) {
			  vscode.postMessage({command: 'ask', text: text});
			  document.getElementById('prompt').value = '';
			}
		  });
  
		  window.addEventListener('message', event => {
			const { command, text } = event.data;
			if (command === 'response') {
			  document.getElementById('response').innerHTML += \`<p><strong>Response:</strong> \${text}</p>\`;
			}
		  });
		</script>
	  </body>
	  </html>
	`;
  }
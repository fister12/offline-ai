import * as vscode from 'vscode';
import ollama from 'ollama';

let modelInstance: any;

export function activate(context: vscode.ExtensionContext) {
    const chatSidebarProvider = new ChatSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatSidebarProvider.viewType, chatSidebarProvider)
    );

    const disposable = vscode.commands.registerCommand('offline-chat.start', () => {
        const panel = vscode.window.createWebviewPanel(
            'chat-Ollama',
            'Ollama Chat',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = getWebViewContent();

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'ask') {
                const userPrompt = message.text;
                let response = '';

                try {
                    modelInstance = await ollama.chat({
                        model: 'llama3.2',  // Make sure this matches your installed model
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });

                    for await (const part of modelInstance) {
                        if (part.message?.content) {
                            response += part.message.content;
                            panel.webview.postMessage({
                                command: 'response',
                                text: response
                            });
                        }
                    }
                } catch (err) {
                    panel.webview.postMessage({
                        command: 'response',
                        text: 'Error: ' + (err instanceof Error ? err.message : String(err))
                    });
                }
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    if (modelInstance) {
        modelInstance.cancel();
    }
}

class ChatSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'offline-chat.sidebar';

    constructor(private readonly extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = getWebViewContent();

        webviewView.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'ask') {
                const userPrompt = message.text;
                let response = '';

                try {
                    modelInstance = await ollama.chat({
                        model: 'llama3.2',  // Make sure this matches your installed model
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });

                    for await (const part of modelInstance) {
                        if (part.message?.content) {
                            response += part.message.content;
                            webviewView.webview.postMessage({
                                command: 'response',
                                text: response
                            });
                        }
                    }
                } catch (err) {
                    webviewView.webview.postMessage({
                        command: 'response',
                        text: 'Error: ' + (err instanceof Error ? err.message : String(err))
                    });
                }
            }
        });
    }
}

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
          <div id="response">
            <textBox id="response-box"></textBox>
          </div>
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
              document.getElementById('response-box').innerText = text;
            }
          });
        </script>
      </body>
      </html>
    `;
}
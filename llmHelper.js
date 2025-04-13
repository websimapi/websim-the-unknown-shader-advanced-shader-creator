export class LLMHelper {
    constructor(shaderEditor) {
        this.shaderEditor = shaderEditor;
        this.conversationHistory = [];
        
        // System message that defines the LLM's behavior and capabilities
        this.systemMessage = {
            role: "system",
            content: `You are an advanced shader programming assistant specializing in GLSL.
                
Your primary role is to help users with their shader code by:
1. Explaining shader concepts and techniques
2. Analyzing, troubleshooting, and improving shader code
3. Translating visual ideas into GLSL code
4. Suggesting optimizations for performance
5. Providing examples of shader effects

When analyzing code, provide detailed explanations of:
- How the shader works (visual effects and technique)
- Any potential issues or bugs
- Performance considerations
- Improvements or alternative approaches

When a user asks for help creating a specific effect, provide:
- Well-commented GLSL code snippets that are ready to use
- Clear explanations of the mathematical principles
- Suggestions for parameters to modify for customization

You have expertise in:
- Vertex and fragment shaders
- GLSL syntax and best practices
- Mathematics for computer graphics (linear algebra, calculus)
- Common shader techniques (lighting, procedural generation, post-processing)
- Real-time rendering optimization

Be helpful, precise, and technically accurate. Users rely on your expertise for creating visual effects.`
        };
    }

    async ask(userMessage) {
        this.addMessageToChat(userMessage, 'user');
        this.showThinking();
        
        try {
            // Get currently selected code if any
            const selectedCode = this.shaderEditor.getSelectedCode();
            
            // Prepare user message with code context if available
            let messageContent = userMessage;
            if (selectedCode) {
                messageContent = `${userMessage}\n\nHere's the shader code I'm referring to:\n\`\`\`glsl\n${selectedCode}\n\`\`\``;
            }
            
            // Create new message and add to history
            const newMessage = {
                role: "user",
                content: messageContent
            };
            
            this.conversationHistory.push(newMessage);
            
            // Keep history manageable
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
            }
            
            // Send to LLM
            const response = await this.callLLM();
            
            // Display response
            this.hideThinking();
            this.addMessageToChat(response.content, 'system');
            
            // Add response to conversation history
            this.conversationHistory.push(response);
            
        } catch (error) {
            console.error('Error querying LLM:', error);
            this.hideThinking();
            this.addMessageToChat('Sorry, there was an error processing your request.', 'system');
        }
    }

    async callLLM() {
        // In a real implementation, this would call an actual LLM API
        // For this prototype, we're simulating the LLM response
        
        // This would normally use the websim.chat.completions.create call
        const completion = await websim.chat.completions.create({
            messages: [
                this.systemMessage,
                ...this.conversationHistory
            ]
        });
        
        return completion;
    }

    addMessageToChat(message, role) {
        const chatMessages = document.getElementById('llmChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Process markdown-like code blocks for shader code
        const formattedMessage = this.formatCodeBlocks(message);
        contentDiv.innerHTML = formattedMessage;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add special handling for code blocks - add "copy" and "apply" buttons
        messageDiv.querySelectorAll('pre code').forEach(codeBlock => {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'code-buttons';
            
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy';
            copyButton.className = 'code-btn copy-btn';
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent);
                copyButton.textContent = 'Copied!';
                setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
            });
            
            const applyButton = document.createElement('button');
            applyButton.textContent = 'Apply to Selection';
            applyButton.className = 'code-btn apply-btn';
            applyButton.addEventListener('click', () => {
                this.shaderEditor.replaceSelectedCode(codeBlock.textContent);
                applyButton.textContent = 'Applied!';
                setTimeout(() => { applyButton.textContent = 'Apply to Selection'; }, 2000);
            });
            
            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(applyButton);
            
            // Insert button container before the code block
            codeBlock.parentNode.insertBefore(buttonContainer, codeBlock);
        });
    }

    formatCodeBlocks(text) {
        // Convert markdown code blocks to HTML
        let formatted = text.replace(/```glsl([\s\S]*?)```/g, '<pre><code class="language-glsl">$1</code></pre>');
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Fix the <br> inside code blocks
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formatted;
        tempDiv.querySelectorAll('pre code').forEach(codeBlock => {
            codeBlock.innerHTML = codeBlock.innerHTML.replace(/<br>/g, '\n');
        });
        
        return tempDiv.innerHTML;
    }

    showThinking() {
        const chatMessages = document.getElementById('llmChatMessages');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message system-message thinking';
        thinkingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
        thinkingDiv.id = 'thinking-indicator';
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideThinking() {
        const thinkingIndicator = document.getElementById('thinking-indicator');
        if (thinkingIndicator) {
            thinkingIndicator.remove();
        }
    }
}


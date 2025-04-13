import * as THREE from 'three';

export class ShaderEditor {
    static DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

    static DEFAULT_FRAGMENT_SHADER = `
uniform float time;
varying vec2 vUv;

void main() {
    vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0, 2, 4));
    gl_FragColor = vec4(color, 1.0);
}
`;

    constructor(initialMaterial) {
        this.currentMaterial = initialMaterial;
        this.vertexCode = initialMaterial.vertexShader || ShaderEditor.DEFAULT_VERTEX_SHADER;
        this.fragmentCode = initialMaterial.fragmentShader || ShaderEditor.DEFAULT_FRAGMENT_SHADER;
        this.editorTabs = document.querySelectorAll('.editor-tab');
        this.activeTab = 'fragment';
        this.editorContainer = document.getElementById('monaco-editor');
        this.editor = null;
        
        // Initialize Monaco editor with proper configuration
        this.initMonacoEditor();
        this.setupEvents();
    }

    initMonacoEditor() {
        // Add loading indicator
        this.editorContainer.innerHTML = '<div class="monaco-loading">Loading editor...</div>';
        
        // We'll load Monaco directly from CDN without using RequireJS
        this.loadMonacoEditor();
    }

    loadMonacoEditor() {
        // Load the main Monaco script
        const scriptMain = document.createElement('script');
        scriptMain.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.39.0/min/vs/editor/editor.main.js';
        scriptMain.defer = true;
        
        // Load editor worker
        const scriptLoader = document.createElement('script');
        scriptLoader.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.39.0/min/vs/loader.js';
        scriptLoader.defer = true;
        
        // Load base CSS
        const linkTag = document.createElement('link');
        linkTag.rel = 'stylesheet';
        linkTag.href = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.39.0/min/vs/editor/editor.main.css';
        
        document.head.appendChild(linkTag);
        document.body.appendChild(scriptLoader);
        
        // Setup editor once loader is ready
        scriptLoader.onload = () => {
            window.require.config({
                paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.39.0/min/vs' }
            });
            
            window.require(['vs/editor/editor.main'], () => {
                this.setupMonacoEditor();
            });
        };
        
        scriptLoader.onerror = (err) => {
            console.error('Failed to load Monaco Editor scripts:', err);
            this.fallbackToSimpleEditor();
        };
    }

    fallbackToSimpleEditor() {
        // Provide a simple textarea as fallback if Monaco fails to load
        this.editorContainer.innerHTML = '';
        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.backgroundColor = '#1e1e1e';
        textarea.style.color = '#d4d4d4';
        textarea.style.fontFamily = 'monospace';
        textarea.style.padding = '10px';
        textarea.value = this.activeTab === 'vertex' ? this.vertexCode : this.fragmentCode;
        
        this.editorContainer.appendChild(textarea);
        
        // Override editor methods with simple implementations
        this.editor = {
            getValue: () => textarea.value,
            setValue: (value) => { textarea.value = value; },
            getSelection: () => {
                return {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1
                };
            },
            getModel: () => ({
                getValueInRange: () => textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
            }),
            executeEdits: (source, edits) => {
                const edit = edits[0];
                textarea.setRangeText(edit.text, textarea.selectionStart, textarea.selectionEnd);
            }
        };
        
        this.showStatusMessage('Using simple editor as fallback', 'warning');
    }

    setupMonacoEditor() {
        try {
            // Clear the loading indicator
            this.editorContainer.innerHTML = '';
            
            // Register GLSL language
            if (window.monaco) {
                monaco.languages.register({ id: 'glsl' });
                
                // Define GLSL syntax highlighting
                monaco.languages.setMonarchTokensProvider('glsl', {
                    tokenizer: {
                        root: [
                            [/[a-zA-Z_]\w*/, { 
                                cases: {
                                    '@keywords': 'keyword',
                                    '@builtins': 'type',
                                    '@default': 'identifier'
                                }
                            }],
                            [/[{}()\[\]]/, '@brackets'],
                            [/[<>](?!@symbols)/, '@brackets'],
                            [/[;,.]/, 'delimiter'],
                            [/\/\/.*$/, 'comment'],
                            [/".*?"/, 'string'],
                            [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                            [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                            [/\d+/, 'number'],
                            [/[=+\-*\/%<>!&|^]=?/, 'operator'],
                        ]
                    },
                    keywords: [
                        'attribute', 'const', 'uniform', 'varying', 'buffer', 'shared', 'coherent', 'volatile', 'restrict',
                        'readonly', 'writeonly', 'atomic_uint', 'layout', 'centroid', 'flat', 'smooth', 'noperspective',
                        'patch', 'sample', 'break', 'continue', 'do', 'for', 'while', 'switch', 'case', 'default',
                        'if', 'else', 'subroutine', 'in', 'out', 'inout', 'true', 'false', 'invariant', 'precise',
                        'discard', 'return', 'struct', 'void', 'bool', 'int', 'uint', 'float', 'double',
                        'vec2', 'vec3', 'vec4', 'dvec2', 'dvec3', 'dvec4', 'bvec2', 'bvec3', 'bvec4', 'ivec2',
                        'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4', 'mat2', 'mat3', 'mat4'
                    ],
                    builtins: [
                        'gl_Position', 'gl_PointSize', 'gl_FragCoord', 'gl_FrontFacing',
                        'gl_FragColor', 'gl_FragData', 'gl_FragDepth', 'sin', 'cos', 'tan',
                        'asin', 'acos', 'atan', 'radians', 'degrees', 'pow', 'exp', 'log'
                    ]
                });
                
                // Create editor instance
                this.editor = monaco.editor.create(this.editorContainer, {
                    value: this.activeTab === 'vertex' ? this.vertexCode : this.fragmentCode,
                    language: 'glsl',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: false }
                });
                
                this.showStatusMessage('Editor loaded successfully', 'success');
            } else {
                throw new Error('Monaco namespace not available');
            }
        } catch (error) {
            console.error('Error creating Monaco editor:', error);
            this.fallbackToSimpleEditor();
        }
    }

    setupEvents() {
        // Tab switching
        this.editorTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.editorTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.shader;
                this.showShader(this.activeTab);
            });
        });
    }

    showShader(type) {
        // Save current editor content before switching
        this.saveCurrentShader();
        
        // Load appropriate shader into editor
        if (this.editor) {
            if (type === 'vertex') {
                this.editor.setValue(this.vertexCode);
            } else {
                this.editor.setValue(this.fragmentCode);
            }
            
            this.activeTab = type;
        }
    }

    saveCurrentShader() {
        if (this.editor) {
            const currentValue = this.editor.getValue();
            if (this.activeTab === 'vertex') {
                this.vertexCode = currentValue;
            } else {
                this.fragmentCode = currentValue;
            }
        }
    }

    applyShaderToMaterial() {
        this.saveCurrentShader();
        
        // Apply shaders to material
        if (this.currentMaterial) {
            try {
                this.currentMaterial.vertexShader = this.vertexCode;
                this.currentMaterial.fragmentShader = this.fragmentCode;
                this.currentMaterial.needsUpdate = true;
                
                // Show success message
                this.showStatusMessage('Shader applied successfully!', 'success');
            } catch (error) {
                console.error('Error applying shader:', error);
                this.showStatusMessage(`Shader error: ${error.message}`, 'error');
            }
        }
    }

    formatCode() {
        // Simple GLSL formatting - in a real app would use a proper formatter
        if (this.editor) {
            const currentValue = this.editor.getValue();
            const formattedValue = this.formatGLSL(currentValue);
            this.editor.setValue(formattedValue);
        }
    }

    formatGLSL(code) {
        // Very basic formatting - just for demo
        // In a real app, use a proper GLSL formatter
        let formatted = '';
        let indentLevel = 0;
        const lines = code.split('\n');
        
        for (let line of lines) {
            const trimmed = line.trim();
            
            // Decrease indent for closing braces
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            // Add appropriate indent
            formatted += '    '.repeat(indentLevel) + trimmed + '\n';
            
            // Increase indent for opening braces
            if (trimmed.endsWith('{')) {
                indentLevel++;
            }
        }
        
        return formatted;
    }

    loadMaterial(material) {
        this.currentMaterial = material;
        
        // Load shaders from material
        if (material.isShaderMaterial) {
            this.vertexCode = material.vertexShader || ShaderEditor.DEFAULT_VERTEX_SHADER;
            this.fragmentCode = material.fragmentShader || ShaderEditor.DEFAULT_FRAGMENT_SHADER;
            this.showShader(this.activeTab);
        } else {
            // For non-shader materials, use defaults and convert to ShaderMaterial
            this.vertexCode = ShaderEditor.DEFAULT_VERTEX_SHADER;
            this.fragmentCode = ShaderEditor.DEFAULT_FRAGMENT_SHADER;
            this.showShader(this.activeTab);
        }
    }

    getSelectedCode() {
        if (!this.editor) return '';
        
        try {
            const selection = this.editor.getSelection();
            if (selection && selection.isEmpty()) {
                return ''; // No selection
            }
            return this.editor.getModel().getValueInRange(selection);
        } catch (error) {
            console.error('Error getting selected code:', error);
            return '';
        }
    }

    replaceSelectedCode(newCode) {
        if (!this.editor) return;
        
        try {
            const selection = this.editor.getSelection();
            if (selection) {
                this.editor.executeEdits('llm-edit', [
                    { range: selection, text: newCode }
                ]);
            }
        } catch (error) {
            console.error('Error replacing selected code:', error);
        }
    }

    showStatusMessage(message, type) {
        // Show a status message in the UI
        const statusElement = document.createElement('div');
        statusElement.className = `status-message ${type}`;
        statusElement.textContent = message;
        
        document.querySelector('.editor-container').appendChild(statusElement);
        
        // Remove after a few seconds
        setTimeout(() => {
            statusElement.classList.add('fade-out');
            setTimeout(() => statusElement.remove(), 500);
        }, 3000);
    }
}
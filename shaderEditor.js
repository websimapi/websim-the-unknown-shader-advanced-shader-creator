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
        
        // Load Monaco Editor using script tag approach for better compatibility
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs/loader.js';
        script.onload = () => {
            // Configure RequireJS
            window.require.config({
                paths: {
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs'
                }
            });
            
            // Load Monaco Editor
            window.require(['vs/editor/editor.main'], () => {
                this.setupMonacoEditor();
            });
        };
        script.onerror = (err) => {
            console.error('Failed to load Monaco Editor:', err);
            this.editorContainer.innerHTML = '<div class="monaco-loading">Failed to load editor. Please refresh the page.</div>';
        };
        
        document.body.appendChild(script);
    }

    setupMonacoEditor() {
        // Clear the loading indicator
        this.editorContainer.innerHTML = '';
        
        // Setup Monaco editor for GLSL
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
                'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4', 'mat2', 'mat3', 'mat4', 'mat2x2', 'mat2x3',
                'mat2x4', 'mat3x2', 'mat3x3', 'mat3x4', 'mat4x2', 'mat4x3', 'mat4x4', 'dmat2', 'dmat3',
                'dmat4', 'dmat2x2', 'dmat2x3', 'dmat2x4', 'dmat3x2', 'dmat3x3', 'dmat3x4', 'dmat4x2',
                'dmat4x3', 'dmat4x4', 'sampler1D', 'sampler2D', 'sampler3D', 'samplerCube', 'sampler1DShadow',
                'sampler2DShadow', 'samplerCubeShadow', 'sampler1DArray', 'sampler2DArray', 'sampler1DArrayShadow',
                'sampler2DArrayShadow', 'isampler1D', 'isampler2D', 'isampler3D', 'isamplerCube',
                'isampler1DArray', 'isampler2DArray', 'usampler1D', 'usampler2D', 'usampler3D',
                'usamplerCube', 'usampler1DArray', 'usampler2DArray'
            ],
            builtins: [
                'gl_Position', 'gl_PointSize', 'gl_ClipVertex', 'gl_FragCoord', 'gl_FrontFacing',
                'gl_FragColor', 'gl_FragData', 'gl_FragDepth', 'gl_Color', 'gl_SecondaryColor',
                'gl_Normal', 'gl_Vertex', 'gl_MultiTexCoord0', 'gl_MultiTexCoord1', 'gl_MultiTexCoord2',
                'gl_MultiTexCoord3', 'gl_MultiTexCoord4', 'gl_MultiTexCoord5', 'gl_MultiTexCoord6',
                'gl_MultiTexCoord7', 'gl_FogCoord', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
                'radians', 'degrees', 'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
                'abs', 'sign', 'floor', 'ceil', 'fract', 'mod', 'min', 'max', 'clamp', 'mix',
                'step', 'smoothstep', 'length', 'distance', 'dot', 'cross', 'normalize', 'reflect',
                'refract', 'matrixCompMult', 'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
                'equal', 'notEqual', 'any', 'all', 'not', 'dFdx', 'dFdy', 'fwidth', 'noise1', 'noise2',
                'noise3', 'noise4', 'texture1D', 'texture2D', 'texture3D', 'textureCube', 'shadow1D',
                'shadow2D', 'shadowCube', 'texture1DProj', 'texture2DProj', 'texture3DProj', 'textureCubeProj',
                'shadow1DProj', 'shadow2DProj', 'shadowCubeProj', 'texture1DLod', 'texture2DLod',
                'texture3DLod', 'textureCubeLod', 'shadow1DLod', 'shadow2DLod', 'shadowCubeLod',
                'texture1DProjLod', 'texture2DProjLod', 'texture3DProjLod', 'textureCubeProjLod',
                'shadow1DProjLod', 'shadow2DProjLod', 'shadowCubeProjLod'
            ]
        });

        try {
            // Create editor instance
            this.editor = monaco.editor.create(this.editorContainer, {
                value: this.fragmentCode,
                language: 'glsl',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: {
                    enabled: false
                }
            });

            // Show the initial shader
            this.showShader(this.activeTab);
        } catch (error) {
            console.error('Error creating Monaco editor:', error);
            this.editorContainer.innerHTML = `<div class="monaco-loading">Error initializing editor: ${error.message}</div>`;
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
        const currentValue = this.editor.getValue();
        const formattedValue = this.formatGLSL(currentValue);
        this.editor.setValue(formattedValue);
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
        const selection = this.editor.getSelection();
        return this.editor.getModel().getValueInRange(selection);
    }

    replaceSelectedCode(newCode) {
        const selection = this.editor.getSelection();
        this.editor.executeEdits('llm-edit', [
            { range: selection, text: newCode }
        ]);
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
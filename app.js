import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ShaderEditor } from './shaderEditor.js';
import { TemplateManager } from './templates.js';
import { LLMHelper } from './llmHelper.js';
import { NodeEditor } from './nodeEditor.js';
import { AssetManager } from './assetManager.js';

class App {
    constructor() {
        // Ensure we don't initialize the app until the DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            this.initThreeJS();
            this.initEditors();
            this.initAssets();
            this.initTemplates();
            this.initLLMHelper();
            this.setupEventListeners();
            this.animate();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showGlobalError('Failed to initialize application. Check console for details.');
        }
    }

    showGlobalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(204, 0, 0, 0.9)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.zIndex = '10000';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    initThreeJS() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        
        // Add grid
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('viewport'),
            antialias: true
        });
        this.updateRendererSize();
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        
        // Add some default objects
        this.addDefaultObjects();
        
        // Handle window resize
        window.addEventListener('resize', () => this.updateRendererSize());
    }

    updateRendererSize() {
        const container = document.querySelector('.viewport-container');
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    addDefaultObjects() {
        // Add default light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Add a default sphere with a basic shader material
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        this.defaultMaterial = new THREE.ShaderMaterial({
            vertexShader: ShaderEditor.DEFAULT_VERTEX_SHADER,
            fragmentShader: ShaderEditor.DEFAULT_FRAGMENT_SHADER,
            uniforms: {
                time: { value: 0 }
            }
        });
        
        this.defaultObject = new THREE.Mesh(geometry, this.defaultMaterial);
        this.scene.add(this.defaultObject);
        
        // Update scene hierarchy display
        this.updateSceneHierarchy();
    }

    updateSceneHierarchy() {
        const sceneTree = document.getElementById('sceneTree');
        sceneTree.innerHTML = '';
        
        // Simple recursive function to list objects
        const addToHierarchy = (object, indent = 0) => {
            const li = document.createElement('li');
            li.textContent = '─'.repeat(indent) + (indent > 0 ? ' ' : '') + object.name || object.type;
            li.style.padding = '3px 0';
            li.style.paddingLeft = `${indent * 10}px`;
            li.style.cursor = 'pointer';
            li.dataset.uuid = object.uuid;
            
            li.addEventListener('click', () => {
                this.selectObject(object);
            });
            
            sceneTree.appendChild(li);
            
            if (object.children && object.children.length > 0) {
                object.children.forEach(child => addToHierarchy(child, indent + 1));
            }
        };
        
        addToHierarchy(this.scene);
    }

    selectObject(object) {
        this.selectedObject = object;
        this.updatePropertiesPanel();
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('propertiesContent');
        panel.innerHTML = '';
        
        if (!this.selectedObject) {
            panel.innerHTML = '<p>No object selected</p>';
            return;
        }
        
        // Object name
        const nameDiv = document.createElement('div');
        nameDiv.innerHTML = `
            <label>Name:</label>
            <input type="text" value="${this.selectedObject.name || ''}" id="objectName">
        `;
        panel.appendChild(nameDiv);
        
        // Position
        const posDiv = document.createElement('div');
        posDiv.innerHTML = `
            <h4>Position</h4>
            <div class="property-row">
                <label>X:</label>
                <input type="number" step="0.1" value="${this.selectedObject.position.x}" id="posX">
            </div>
            <div class="property-row">
                <label>Y:</label>
                <input type="number" step="0.1" value="${this.selectedObject.position.y}" id="posY">
            </div>
            <div class="property-row">
                <label>Z:</label>
                <input type="number" step="0.1" value="${this.selectedObject.position.z}" id="posZ">
            </div>
        `;
        panel.appendChild(posDiv);
        
        // Rotation
        const rotDiv = document.createElement('div');
        rotDiv.innerHTML = `
            <h4>Rotation</h4>
            <div class="property-row">
                <label>X:</label>
                <input type="number" step="0.1" value="${this.selectedObject.rotation.x}" id="rotX">
            </div>
            <div class="property-row">
                <label>Y:</label>
                <input type="number" step="0.1" value="${this.selectedObject.rotation.y}" id="rotY">
            </div>
            <div class="property-row">
                <label>Z:</label>
                <input type="number" step="0.1" value="${this.selectedObject.rotation.z}" id="rotZ">
            </div>
        `;
        panel.appendChild(rotDiv);
        
        // Material properties if available
        if (this.selectedObject.material) {
            const matDiv = document.createElement('div');
            matDiv.innerHTML = `
                <h4>Material</h4>
                <button id="editMaterial">Edit Shader</button>
            `;
            panel.appendChild(matDiv);
            
            document.getElementById('editMaterial').addEventListener('click', () => {
                this.shaderEditor.loadMaterial(this.selectedObject.material);
            });
        }
        
        // Add event listeners to update object properties
        document.getElementById('objectName').addEventListener('change', (e) => {
            this.selectedObject.name = e.target.value;
            this.updateSceneHierarchy();
        });
        
        document.getElementById('posX').addEventListener('change', (e) => {
            this.selectedObject.position.x = parseFloat(e.target.value);
        });
        
        document.getElementById('posY').addEventListener('change', (e) => {
            this.selectedObject.position.y = parseFloat(e.target.value);
        });
        
        document.getElementById('posZ').addEventListener('change', (e) => {
            this.selectedObject.position.z = parseFloat(e.target.value);
        });
        
        document.getElementById('rotX').addEventListener('change', (e) => {
            this.selectedObject.rotation.x = parseFloat(e.target.value);
        });
        
        document.getElementById('rotY').addEventListener('change', (e) => {
            this.selectedObject.rotation.y = parseFloat(e.target.value);
        });
        
        document.getElementById('rotZ').addEventListener('change', (e) => {
            this.selectedObject.rotation.z = parseFloat(e.target.value);
        });
    }

    initEditors() {
        // Initialize shader editor
        this.shaderEditor = new ShaderEditor(this.defaultMaterial);
        
        // Initialize node editor
        this.nodeEditor = new NodeEditor();
    }

    initAssets() {
        this.assetManager = new AssetManager(this.scene, this.updateSceneHierarchy.bind(this));
    }

    initTemplates() {
        this.templateManager = new TemplateManager(this.shaderEditor);
    }

    initLLMHelper() {
        this.llmHelper = new LLMHelper(this.shaderEditor);
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.getElementById(target).classList.add('active');
                
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
        
        // Editor mode switching
        document.getElementById('codeViewBtn').addEventListener('click', () => {
            document.getElementById('codeEditor').classList.add('active');
            document.getElementById('nodeEditor').classList.remove('active');
            document.getElementById('codeViewBtn').classList.add('active');
            document.getElementById('nodeViewBtn').classList.remove('active');
        });
        
        document.getElementById('nodeViewBtn').addEventListener('click', () => {
            document.getElementById('nodeEditor').classList.add('active');
            document.getElementById('codeEditor').classList.remove('active');
            document.getElementById('nodeViewBtn').classList.add('active');
            document.getElementById('codeViewBtn').classList.remove('active');
        });
        
        // Viewport controls
        document.getElementById('resetCamera').addEventListener('click', () => {
            this.camera.position.set(0, 2, 5);
            this.camera.lookAt(0, 0, 0);
            this.controls.reset();
        });
        
        document.getElementById('toggleWireframe').addEventListener('click', () => {
            this.scene.traverse(obj => {
                if (obj.material) {
                    obj.material.wireframe = !obj.material.wireframe;
                }
            });
        });
        
        document.getElementById('takeScreenshot').addEventListener('click', () => {
            this.renderer.render(this.scene, this.camera);
            const screenshot = this.renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = screenshot;
            link.download = 'shader-screenshot.png';
            link.click();
        });
        
        // LLM Helper modal
        document.getElementById('askLLM').addEventListener('click', () => {
            document.getElementById('llmHelperModal').style.display = 'block';
        });
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('llmHelperModal').style.display = 'none';
        });
        
        // Send message to LLM
        document.getElementById('sendToLLM').addEventListener('click', () => {
            const input = document.getElementById('llmInput').value.trim();
            if (input) {
                this.llmHelper.ask(input);
                document.getElementById('llmInput').value = '';
            }
        });
        
        // LLM input key events
        document.getElementById('llmInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('sendToLLM').click();
            }
        });
        
        // Run shader button
        document.getElementById('runShader').addEventListener('click', () => {
            this.shaderEditor.applyShaderToMaterial();
        });
        
        // Format code button
        document.getElementById('formatCode').addEventListener('click', () => {
            this.shaderEditor.formatCode();
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Update shader uniforms
        this.scene.traverse(object => {
            if (object.material && object.material.uniforms && object.material.uniforms.time) {
                object.material.uniforms.time.value = performance.now() / 1000;
            }
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Create app instance with error handling
window.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new App();
        
        // Global error handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
        
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });
    } catch (error) {
        console.error('Critical error creating app:', error);
        alert('Failed to initialize the application. Please check your browser console for details.');
    }
});
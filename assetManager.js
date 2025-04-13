export class AssetManager {
    constructor(scene, updateSceneHierarchyCallback) {
        this.scene = scene;
        this.updateSceneHierarchy = updateSceneHierarchyCallback;
        this.assets = {
            textures: [],
            models: [],
            hdri: []
        };
        
        this.assetLibrary = document.querySelector('.asset-library');
        this.loadDefaultAssets();
        this.setupEventListeners();
    }

    loadDefaultAssets() {
        // Predefined textures
        const textureAssets = [
            { name: 'Grid', thumbnail: this.createThumbnail('#222', 'Grid', 'textures') },
            { name: 'Noise', thumbnail: this.createThumbnail('#666', 'Noise', 'textures') },
            { name: 'Brick', thumbnail: this.createThumbnail('#8B4513', 'Brick', 'textures') },
            { name: 'Wood', thumbnail: this.createThumbnail('#A0522D', 'Wood', 'textures') }
        ];
        
        // Predefined models
        const modelAssets = [
            { name: 'Sphere', thumbnail: this.createThumbnail('#3498db', 'Sphere', 'models') },
            { name: 'Cube', thumbnail: this.createThumbnail('#2ecc71', 'Cube', 'models') },
            { name: 'Torus', thumbnail: this.createThumbnail('#e67e22', 'Torus', 'models') },
            { name: 'Plane', thumbnail: this.createThumbnail('#9b59b6', 'Plane', 'models') }
        ];
        
        // Predefined HDRIs
        const hdriAssets = [
            { name: 'Studio', thumbnail: this.createThumbnail('#f1c40f', 'Studio', 'hdri') },
            { name: 'Forest', thumbnail: this.createThumbnail('#27ae60', 'Forest', 'hdri') },
            { name: 'Night Sky', thumbnail: this.createThumbnail('#34495e', 'Night', 'hdri') }
        ];
        
        // Add to assets
        this.assets.textures = textureAssets;
        this.assets.models = modelAssets;
        this.assets.hdri = hdriAssets;
        
        // Populate the asset library with textures (default category)
        this.showAssetCategory('textures');
    }

    showAssetCategory(category) {
        this.assetLibrary.innerHTML = '';
        
        this.assets[category].forEach(asset => {
            const assetElement = document.createElement('div');
            assetElement.className = 'asset-item';
            assetElement.dataset.category = category;
            assetElement.dataset.name = asset.name;
            assetElement.innerHTML = `
                <div class="asset-thumbnail">${asset.thumbnail}</div>
                <div class="asset-name">${asset.name}</div>
            `;
            
            assetElement.addEventListener('click', () => {
                this.useAsset(category, asset.name);
            });
            
            this.assetLibrary.appendChild(assetElement);
        });
    }

    createThumbnail(color, text, type) {
        let icon = '';
        
        if (type === 'textures') {
            icon = `<rect x="15" y="15" width="30" height="30" fill="${color}" stroke="white" stroke-width="1" />`;
        } else if (type === 'models') {
            if (text === 'Sphere') {
                icon = `<circle cx="30" cy="30" r="15" fill="${color}" stroke="white" stroke-width="1" />`;
            } else if (text === 'Cube') {
                icon = `<rect x="15" y="15" width="30" height="30" fill="${color}" stroke="white" stroke-width="1" />`;
            } else if (text === 'Torus') {
                icon = `<circle cx="30" cy="30" r="15" fill="none" stroke="${color}" stroke-width="8" />`;
            } else if (text === 'Plane') {
                icon = `<rect x="15" y="25" width="30" height="10" fill="${color}" stroke="white" stroke-width="1" />`;
            }
        } else if (type === 'hdri') {
            icon = `<circle cx="30" cy="30" r="20" fill="${color}" stroke="white" stroke-width="1" />
                    <circle cx="38" cy="25" r="5" fill="white" opacity="0.8" />`;
        }
        
        return `<svg width="60" height="60" viewBox="0 0 60 60">
            <rect width="60" height="60" fill="#333" rx="4" ry="4"/>
            ${icon}
            <text x="30" y="52" fill="white" text-anchor="middle" font-size="10">${text}</text>
        </svg>`;
    }

    useAsset(category, name) {
        // Implementation for adding assets to scene
        if (category === 'models') {
            this.addModelToScene(name);
        } else if (category === 'textures') {
            // Open dialog to select which object to apply texture to
            this.showTextureApplyDialog(name);
        } else if (category === 'hdri') {
            this.applyHdriToScene(name);
        }
    }

    addModelToScene(modelName) {
        const THREE = window.THREE;
        let geometry;
        
        // Create geometry based on model name
        switch (modelName) {
            case 'Sphere':
                geometry = new THREE.SphereGeometry(1, 32, 32);
                break;
            case 'Cube':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'Torus':
                geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
                break;
            case 'Plane':
                geometry = new THREE.PlaneGeometry(2, 2);
                break;
            default:
                geometry = new THREE.SphereGeometry(1, 32, 32);
        }
        
        // Create material with default shader
        const material = new THREE.ShaderMaterial({
            vertexShader: /* Reuse default vertex shader from ShaderEditor */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
            fragmentShader: /* Reuse default fragment shader from ShaderEditor */ `
uniform float time;
varying vec2 vUv;

void main() {
    vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0, 2, 4));
    gl_FragColor = vec4(color, 1.0);
}`,
            uniforms: {
                time: { value: 0 }
            }
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = modelName;
        mesh.position.set(
            Math.random() * 4 - 2,
            Math.random() * 4 - 2,
            Math.random() * 4 - 2
        );
        
        // Add to scene
        this.scene.add(mesh);
        this.updateSceneHierarchy();
        
        // Show notification
        this.showNotification(`Added ${modelName} to scene`);
    }

    showTextureApplyDialog(textureName) {
        // In a real implementation, we would create a texture from a file
        // For this example, we'll just show a notification
        this.showNotification(`Selected texture: ${textureName} (Select an object to apply it to)`);
    }

    applyHdriToScene(hdriName) {
        // In a real implementation, we would load an HDRI environment map
        // For this example, we'll just show a notification
        this.showNotification(`Applied ${hdriName} HDRI to scene`);
    }

    setupEventListeners() {
        // Category switching
        document.querySelectorAll('.asset-categories .category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                document.querySelectorAll('.asset-categories .category-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                // Show assets for selected category
                const category = btn.dataset.category;
                this.showAssetCategory(category);
            });
        });
        
        // Upload button
        document.getElementById('uploadAsset').addEventListener('click', () => {
            // Create a hidden file input and trigger it
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.jpg,.png,.jpeg,.gif,.obj,.gltf,.glb,.hdr';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    this.handleFileUpload(file);
                }
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });
    }

    handleFileUpload(file) {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        // Determine asset type based on extension
        let category;
        if (['jpg', 'png', 'jpeg', 'gif'].includes(fileExtension)) {
            category = 'textures';
        } else if (['obj', 'gltf', 'glb'].includes(fileExtension)) {
            category = 'models';
        } else if (['hdr'].includes(fileExtension)) {
            category = 'hdri';
        } else {
            this.showNotification('Unsupported file type', 'error');
            return;
        }
        
        // In a real implementation, we would load and process the file
        // For this example, we'll just add it to our asset list
        const assetName = fileName.split('.')[0];
        const newAsset = {
            name: assetName,
            thumbnail: this.createThumbnail('#888', assetName.substring(0, 5), category),
            file: file  // Store reference to file
        };
        
        this.assets[category].push(newAsset);
        
        // If we're currently viewing this category, refresh the display
        const activeCategory = document.querySelector('.asset-categories .category-btn.active').dataset.category;
        if (activeCategory === category) {
            this.showAssetCategory(category);
        }
        
        this.showNotification(`Uploaded ${assetName} successfully!`);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateY(-20px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}


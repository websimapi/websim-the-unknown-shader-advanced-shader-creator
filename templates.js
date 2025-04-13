export class TemplateManager {
    constructor(shaderEditor) {
        this.shaderEditor = shaderEditor;
        this.templateLibrary = document.querySelector('.template-library');
        this.loadTemplates();
        this.setupEventListeners();
    }

    loadTemplates() {
        // Load template categories
        const templates = {
            materials: [
                {
                    name: 'Basic Phong',
                    thumbnail: this.createThumbnail('#6495ED', 'Phong'),
                    vertex: `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}`,
                    fragment: `
uniform vec3 color;
uniform vec3 ambientLight;
uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float shininess;
uniform float specularStrength;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightPosition);
    
    // Ambient
    vec3 ambient = ambientLight * color;
    
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * lightColor * color;
    
    // Specular
    vec3 viewDir = normalize(vViewPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;
    
    vec3 result = ambient + diffuse + specular;
    gl_FragColor = vec4(result, 1.0);
}`
                },
                {
                    name: 'Procedural Marble',
                    thumbnail: this.createThumbnail('#8B4513', 'Marble'),
                    vertex: `
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
                    fragment: `
uniform vec3 baseColor;
uniform vec3 veinColor;
uniform float scale;
uniform float time;

varying vec3 vPosition;
varying vec2 vUv;

// Classic Perlin 3D Noise by Stefan Gustavson
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float noise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
}

void main() {
    // Create marble-like pattern
    float n = 0.0;
    // Layer several noise functions
    n += 0.5 * noise(vPosition * scale + time * 0.1);
    n += 0.25 * noise(vPosition * scale * 2.0);
    n += 0.125 * noise(vPosition * scale * 4.0);
    n += 0.0625 * noise(vPosition * scale * 8.0);
    
    // Create marble veins with sine function
    float marble = (sin((vPosition.y + vPosition.x) * scale + n * 5.0) + 1.0) * 0.5;
    
    // Smooth step to create sharper veins
    marble = smoothstep(0.0, 1.0, marble);
    
    // Mix base color with vein color
    vec3 color = mix(veinColor, baseColor, marble);
    
    gl_FragColor = vec4(color, 1.0);
}`
                }
            ],
            effects: [
                {
                    name: 'Plasma Effect',
                    thumbnail: this.createThumbnail('#FF00FF', 'Plasma'),
                    vertex: `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
                    fragment: `
uniform float time;
varying vec2 vUv;

void main() {
    float v1 = sin((vUv.x * 10.0) + time);
    float v2 = sin((vUv.y * 10.0) + time);
    float v3 = sin((vUv.x * 10.0) + (vUv.y * 10.0) + time);
    float v4 = sin(sqrt(pow((vUv.x - 0.5) * 20.0, 2.0) + pow((vUv.y - 0.5) * 20.0, 2.0)) + time);
    
    float cx = vUv.x - 0.5;
    float cy = vUv.y - 0.5;
    float v5 = sin(sqrt(cx * cx + cy * cy) * 20.0 + time);
    
    float v = (v1 + v2 + v3 + v4 + v5) * 0.2;
    
    gl_FragColor = vec4(
        sin(v * 3.14159 * 2.0) * 0.5 + 0.5,
        sin(v * 3.14159 * 2.0 + 3.14159 * 0.6) * 0.5 + 0.5,
        sin(v * 3.14159 * 2.0 + 3.14159 * 1.3) * 0.5 + 0.5,
        1.0
    );
}`
                },
                {
                    name: 'Fire Effect',
                    thumbnail: this.createThumbnail('#FF4500', 'Fire'),
                    vertex: `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
                    fragment: `
uniform float time;
varying vec2 vUv;

// Simplex noise function
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
        -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
        dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    // Adjust UVs for fire effect
    vec2 uv = vUv;
    uv.y = 1.0 - uv.y; // Flip y so fire rises up
    
    // Layer several noise functions for fire effect
    float noise1 = snoise(vec2(uv.x * 4.0, uv.y * 2.0 - time * 1.5)) * 0.5 + 0.5;
    float noise2 = snoise(vec2(uv.x * 8.0, uv.y * 4.0 - time * 2.0)) * 0.5 + 0.5;
    float noise3 = snoise(vec2(uv.x * 16.0, uv.y * 8.0 - time * 3.0)) * 0.5 + 0.5;
    float noise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
    
    // Create fire gradient
    float gradient = 1.0 - pow(uv.y, 0.8); // Power value affects fire height
    float fire = noise * gradient;
    
    // Add color
    vec3 color = vec3(1.0, 0.5, 0.0); // Base orange color
    
    // Make red at bottom, yellow at top
    color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), pow(fire, 0.5));
    
    // Add blue to the base of the flame for a hotter look
    if (fire < 0.1) {
        color = mix(vec3(0.0, 0.0, 0.8), color, fire * 10.0);
    }
    
    // Apply fire intensity
    color *= fire;
    
    // Add dark edges
    color *= smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
    
    gl_FragColor = vec4(color, 1.0);
}`
                },
            ],
            environments: [
                {
                    name: 'Skybox',
                    thumbnail: this.createThumbnail('#87CEEB', 'Sky'),
                    vertex: `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
                    fragment: `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
    float h = normalize(vWorldPosition + offset).y;
    float t = max(pow(max(h, 0.0), exponent), 0.0);
    
    gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
}`
                },
                {
                    name: 'Water Surface',
                    thumbnail: this.createThumbnail('#1E90FF', 'Water'),
                    vertex: `
uniform float time;
uniform float waveHeight;
uniform float waveSpeed;
uniform float waveFrequency;

varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vPosition = position;
    
    // Create wave effect
    float wave1 = sin(position.x * waveFrequency + time * waveSpeed) * 
                 sin(position.z * waveFrequency * 0.8 + time * waveSpeed * 0.8);
    float wave2 = sin(position.z * waveFrequency * 1.2 + time * waveSpeed * 1.3) * 
                 sin(position.x * waveFrequency * 1.3 + time * waveSpeed * 1.2);
    float waveSum = wave1 * 0.6 + wave2 * 0.4;
    
    // Apply wave to vertex
    vec3 newPosition = position;
    newPosition.y += waveSum * waveHeight;
    
    // Calculate normal (analytical derivative of the wave)
    float dx1 = waveFrequency * cos(position.x * waveFrequency + time * waveSpeed) * 
               sin(position.z * waveFrequency * 0.8 + time * waveSpeed * 0.8);
    float dz1 = waveFrequency * 0.8 * sin(position.x * waveFrequency + time * waveSpeed) * 
               cos(position.z * waveFrequency * 0.8 + time * waveSpeed * 0.8);
               
    float dx2 = waveFrequency * 1.3 * cos(position.z * waveFrequency * 1.2 + time * waveSpeed * 1.3);
    float dz2 = waveFrequency * 1.2 * cos(position.x * waveFrequency * 1.3 + time * waveSpeed * 1.2);
    
    vec3 newNormal = normalize(vec3(
        -(dx1 * 0.6 + dx2 * 0.4) * waveHeight,
        1.0,
        -(dz1 * 0.6 + dz2 * 0.4) * waveHeight
    ));
    
    vNormal = normalMatrix * newNormal;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`,
                    fragment: `
uniform vec3 waterColor;
uniform vec3 foamColor;
uniform float time;
uniform vec3 lightDir;

varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vNormal;

// Simplex noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
        -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
        dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    // Calculate Fresnel effect (view-dependent reflection)
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vNormal)), 0.0), 3.0);
    
    // Add foam using noise
    float foam1 = snoise(vec2(vPosition.x * 0.05 + time * 0.03, vPosition.z * 0.05 + time * 0.02));
    float foam2 = snoise(vec2(vPosition.x * 0.1 - time * 0.04, vPosition.z * 0.1 + time * 0.03));
    float foam = pow(max(foam1 * foam2, 0.0), 2.0) * 0.5;
    
    // Simple lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDirection = normalize(lightDir);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 64.0);
    
    // Combine everything
    vec3 finalColor = mix(waterColor, foamColor, foam);
    finalColor += vec3(1.0) * specular * 0.5;
    finalColor = mix(finalColor, vec3(0.8, 0.9, 1.0), fresnel * 0.7);
    
    gl_FragColor = vec4(finalColor, 1.0);
}`
                }
            ]
        };

        // Populate the template library with the defined templates
        Object.keys(templates).forEach(category => {
            templates[category].forEach(template => {
                const templateElement = this.createTemplateElement(template);
                this.templateLibrary.appendChild(templateElement);
                templateElement.dataset.category = category;
                templateElement.style.display = category === 'materials' ? 'block' : 'none';
            });
        });
    }

    createTemplateElement(template) {
        const templateElement = document.createElement('div');
        templateElement.className = 'template-item';
        templateElement.innerHTML = `
            <div class="template-thumbnail">${template.thumbnail}</div>
            <div class="template-name">${template.name}</div>
        `;
        
        // Add click event to apply the template
        templateElement.addEventListener('click', () => {
            this.applyTemplate(template);
        });
        
        return templateElement;
    }

    createThumbnail(color, text) {
        // Create a simple SVG thumbnail
        return `<svg width="60" height="60" viewBox="0 0 60 60">
            <rect width="60" height="60" fill="${color}" rx="4" ry="4"/>
            <text x="30" y="35" fill="white" text-anchor="middle" font-size="10">${text}</text>
        </svg>`;
    }

    applyTemplate(template) {
        // Update the shader editor with the template code
        this.shaderEditor.vertexCode = template.vertex;
        this.shaderEditor.fragmentCode = template.fragment;
        this.shaderEditor.showShader(this.shaderEditor.activeTab);
        
        // Apply to current material
        this.shaderEditor.applyShaderToMaterial();
    }

    setupEventListeners() {
        // Filter templates by category
        document.querySelectorAll('.template-categories .category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                document.querySelectorAll('.template-categories .category-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                // Filter templates
                const category = btn.dataset.category;
                document.querySelectorAll('.template-item').forEach(item => {
                    if (item.dataset.category === category) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
}


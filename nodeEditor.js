export class NodeEditor {
    constructor() {
        this.canvas = document.querySelector('.node-canvas');
        this.nodes = [];
        this.connections = [];
        this.draggedNode = null;
        this.selectedNode = null;
        this.draggingConnection = false;
        this.connectionStart = null;
        this.connectionEnd = null;
        
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Node palette drag events
        document.querySelectorAll('.node-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('node-type', item.dataset.nodeType);
            });
        });
        
        // Canvas events for dropping nodes and handling connections
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('node-type');
            if (nodeType) {
                this.createNode(nodeType, e.offsetX, e.offsetY);
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            // Check if clicked on a node
            const node = this.findNodeAt(e.offsetX, e.offsetY);
            if (node) {
                if (this.isOnNodeInput(node, e.offsetX, e.offsetY)) {
                    // Handle connecting to input
                    if (this.draggingConnection) {
                        this.completeConnection(node, 'input');
                    }
                } else if (this.isOnNodeOutput(node, e.offsetX, e.offsetY)) {
                    // Start creating a connection
                    this.startConnection(node);
                } else {
                    // Select and drag node
                    this.selectNode(node);
                    this.draggedNode = node;
                    node.dragOffsetX = e.offsetX - node.x;
                    node.dragOffsetY = e.offsetY - node.y;
                }
            } else {
                // Clicked on canvas background
                this.selectNode(null);
                this.draggedNode = null;
                
                // Cancel connection if dragging
                if (this.draggingConnection) {
                    this.cancelConnection();
                }
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.draggedNode) {
                this.draggedNode.x = e.offsetX - this.draggedNode.dragOffsetX;
                this.draggedNode.y = e.offsetY - this.draggedNode.dragOffsetY;
                this.render();
            }
            
            if (this.draggingConnection) {
                this.connectionEnd = { x: e.offsetX, y: e.offsetY };
                this.render();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.draggedNode = null;
            
            if (this.draggingConnection) {
                // If dropped not on a valid input, cancel
                this.cancelConnection();
            }
        });
    }

    createNode(type, x, y) {
        // Define node properties based on type
        const nodeTypes = {
            texture: {
                title: 'Texture',
                color: '#4b6584',
                inputs: [{ name: 'UV', type: 'vector2' }],
                outputs: [{ name: 'Color', type: 'vector4' }]
            },
            color: {
                title: 'Color',
                color: '#eb3b5a',
                inputs: [],
                outputs: [{ name: 'Color', type: 'vector4' }]
            },
            vector: {
                title: 'Vector',
                color: '#3867d6',
                inputs: [],
                outputs: [{ name: 'Vector', type: 'vector3' }]
            },
            mix: {
                title: 'Mix',
                color: '#20bf6b',
                inputs: [
                    { name: 'Value A', type: 'any' },
                    { name: 'Value B', type: 'any' },
                    { name: 'Factor', type: 'float' }
                ],
                outputs: [{ name: 'Result', type: 'any' }]
            },
            noise: {
                title: 'Noise',
                color: '#8854d0',
                inputs: [
                    { name: 'Vector', type: 'vector3' },
                    { name: 'Scale', type: 'float' }
                ],
                outputs: [{ name: 'Value', type: 'float' }]
            },
            math: {
                title: 'Math',
                color: '#fa8231',
                inputs: [
                    { name: 'Value A', type: 'float' },
                    { name: 'Value B', type: 'float' }
                ],
                outputs: [{ name: 'Result', type: 'float' }]
            }
        };
        
        // Create the node
        const nodeConfig = nodeTypes[type];
        if (!nodeConfig) return;
        
        const node = {
            id: 'node_' + Date.now(),
            type: type,
            title: nodeConfig.title,
            color: nodeConfig.color,
            x: x,
            y: y,
            width: 150,
            height: 30 + (Math.max(nodeConfig.inputs.length, nodeConfig.outputs.length) * 25),
            inputs: nodeConfig.inputs,
            outputs: nodeConfig.outputs,
            properties: {}
        };
        
        // Add properties specific to node type
        if (type === 'color') {
            node.properties.color = '#ffffff';
        } else if (type === 'vector') {
            node.properties.x = 0;
            node.properties.y = 0;
            node.properties.z = 0;
        } else if (type === 'math') {
            node.properties.operation = 'add';
        }
        
        this.nodes.push(node);
        this.selectNode(node);
        this.render();
    }

    selectNode(node) {
        this.selectedNode = node;
        this.render();
        this.updatePropertiesPanel();
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('propertiesContent');
        panel.innerHTML = '';
        
        if (!this.selectedNode) {
            panel.innerHTML = '<p>No node selected</p>';
            return;
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `<h4>${this.selectedNode.title} Node</h4>`;
        panel.appendChild(titleDiv);
        
        // Show properties specific to the node type
        const node = this.selectedNode;
        
        if (node.type === 'color') {
            const colorPicker = document.createElement('div');
            colorPicker.innerHTML = `
                <label>Color:</label>
                <input type="color" value="${node.properties.color}" id="nodeColor">
            `;
            panel.appendChild(colorPicker);
            
            document.getElementById('nodeColor').addEventListener('change', (e) => {
                node.properties.color = e.target.value;
            });
        } 
        else if (node.type === 'vector') {
            const vectorInputs = document.createElement('div');
            vectorInputs.innerHTML = `
                <div class="property-row">
                    <label>X:</label>
                    <input type="number" step="0.1" value="${node.properties.x}" id="vectorX">
                </div>
                <div class="property-row">
                    <label>Y:</label>
                    <input type="number" step="0.1" value="${node.properties.y}" id="vectorY">
                </div>
                <div class="property-row">
                    <label>Z:</label>
                    <input type="number" step="0.1" value="${node.properties.z}" id="vectorZ">
                </div>
            `;
            panel.appendChild(vectorInputs);
            
            document.getElementById('vectorX').addEventListener('change', (e) => {
                node.properties.x = parseFloat(e.target.value);
            });
            document.getElementById('vectorY').addEventListener('change', (e) => {
                node.properties.y = parseFloat(e.target.value);
            });
            document.getElementById('vectorZ').addEventListener('change', (e) => {
                node.properties.z = parseFloat(e.target.value);
            });
        }
        else if (node.type === 'math') {
            const mathOps = document.createElement('div');
            mathOps.innerHTML = `
                <label>Operation:</label>
                <select id="mathOperation">
                    <option value="add" ${node.properties.operation === 'add' ? 'selected' : ''}>Add</option>
                    <option value="subtract" ${node.properties.operation === 'subtract' ? 'selected' : ''}>Subtract</option>
                    <option value="multiply" ${node.properties.operation === 'multiply' ? 'selected' : ''}>Multiply</option>
                    <option value="divide" ${node.properties.operation === 'divide' ? 'selected' : ''}>Divide</option>
                    <option value="sin" ${node.properties.operation === 'sin' ? 'selected' : ''}>Sine</option>
                    <option value="cos" ${node.properties.operation === 'cos' ? 'selected' : ''}>Cosine</option>
                    <option value="pow" ${node.properties.operation === 'pow' ? 'selected' : ''}>Power</option>
                </select>
            `;
            panel.appendChild(mathOps);
            
            document.getElementById('mathOperation').addEventListener('change', (e) => {
                node.properties.operation = e.target.value;
            });
        }
        else if (node.type === 'noise') {
            const noiseProps = document.createElement('div');
            noiseProps.innerHTML = `
                <div class="property-row">
                    <label>Octaves:</label>
                    <input type="number" min="1" max="10" value="${node.properties.octaves || 1}" id="noiseOctaves">
                </div>
                <div class="property-row">
                    <label>Persistence:</label>
                    <input type="number" step="0.1" min="0" max="1" value="${node.properties.persistence || 0.5}" id="noisePersistence">
                </div>
            `;
            panel.appendChild(noiseProps);
            
            document.getElementById('noiseOctaves').addEventListener('change', (e) => {
                node.properties.octaves = parseInt(e.target.value);
            });
            document.getElementById('noisePersistence').addEventListener('change', (e) => {
                node.properties.persistence = parseFloat(e.target.value);
            });
        }
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Node';
        deleteBtn.className = 'delete-node-btn';
        deleteBtn.style.marginTop = '10px';
        deleteBtn.addEventListener('click', () => {
            this.deleteNode(node);
        });
        panel.appendChild(deleteBtn);
    }

    deleteNode(node) {
        // Remove connections for this node
        this.connections = this.connections.filter(conn => 
            conn.from.node.id !== node.id && conn.to.node.id !== node.id);
        
        // Remove node
        this.nodes = this.nodes.filter(n => n.id !== node.id);
        
        // Update UI
        this.selectedNode = null;
        this.updatePropertiesPanel();
        this.render();
    }

    render() {
        // Get canvas context
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        // Set canvas dimensions
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw connections
        ctx.lineWidth = 2;
        this.connections.forEach(conn => {
            const startPos = this.getOutputPosition(conn.from.node, conn.from.index);
            const endPos = this.getInputPosition(conn.to.node, conn.to.index);
            
            this.drawConnection(ctx, startPos.x, startPos.y, endPos.x, endPos.y, conn.to.type);
        });
        
        // Draw active connection being created
        if (this.draggingConnection && this.connectionStart && this.connectionEnd) {
            ctx.strokeStyle = 'rgba(82, 148, 226, 0.8)';
            ctx.beginPath();
            this.drawConnection(
                ctx, 
                this.connectionStart.x, 
                this.connectionStart.y, 
                this.connectionEnd.x, 
                this.connectionEnd.y,
                'temporary'
            );
        }
        
        // Draw nodes
        this.nodes.forEach(node => {
            this.drawNode(ctx, node);
        });
    }

    drawNode(ctx, node) {
        const isSelected = this.selectedNode === node;
        
        // Node background
        ctx.fillStyle = node.color;
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = isSelected ? 2 : 1;
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, node.width, node.height, 5);
        ctx.fill();
        ctx.stroke();
        
        // Node title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x + node.width / 2, node.y + 18);
        
        // Divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(node.x, node.y + 30);
        ctx.lineTo(node.x + node.width, node.y + 30);
        ctx.stroke();
        
        // Draw inputs
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        node.inputs.forEach((input, index) => {
            const y = node.y + 45 + index * 25;
            
            // Input connector
            ctx.fillStyle = this.getTypeColor(input.type);
            ctx.beginPath();
            ctx.arc(node.x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Input name
            ctx.fillStyle = '#ffffff';
            ctx.fillText(input.name, node.x + 10, y + 4);
        });
        
        // Draw outputs
        ctx.textAlign = 'right';
        node.outputs.forEach((output, index) => {
            const y = node.y + 45 + index * 25;
            
            // Output connector
            ctx.fillStyle = this.getTypeColor(output.type);
            ctx.beginPath();
            ctx.arc(node.x + node.width, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Output name
            ctx.fillStyle = '#ffffff';
            ctx.fillText(output.name, node.x + node.width - 10, y + 4);
        });
    }

    drawConnection(ctx, x1, y1, x2, y2, type) {
        // Bezier curve for connections
        const bezierOffset = Math.min(150, Math.abs(x2 - x1) * 0.7);
        
        ctx.strokeStyle = this.getTypeColor(type);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(
            x1 + bezierOffset, y1,
            x2 - bezierOffset, y2,
            x2, y2
        );
        ctx.stroke();
    }

    getTypeColor(type) {
        const colors = {
            float: '#ffba08',
            vector2: '#3a86ff',
            vector3: '#3a86ff',
            vector4: '#8338ec',
            any: '#06d6a0',
            temporary: '#52b3d9'
        };
        return colors[type] || '#ffffff';
    }

    findNodeAt(x, y) {
        // Find node in reverse order (top-most first)
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (
                x >= node.x && 
                x <= node.x + node.width && 
                y >= node.y && 
                y <= node.y + node.height
            ) {
                return node;
            }
        }
        return null;
    }

    isOnNodeInput(node, x, y) {
        for (let i = 0; i < node.inputs.length; i++) {
            const inputY = node.y + 45 + i * 25;
            const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - inputY, 2));
            if (distance <= 7) {  // Input hit radius
                return {
                    index: i,
                    type: node.inputs[i].type
                };
            }
        }
        return false;
    }

    isOnNodeOutput(node, x, y) {
        for (let i = 0; i < node.outputs.length; i++) {
            const outputY = node.y + 45 + i * 25;
            const distance = Math.sqrt(Math.pow(x - (node.x + node.width), 2) + Math.pow(y - outputY, 2));
            if (distance <= 7) {  // Output hit radius
                return {
                    index: i,
                    type: node.outputs[i].type
                };
            }
        }
        return false;
    }

    getInputPosition(node, inputIndex) {
        return {
            x: node.x,
            y: node.y + 45 + inputIndex * 25
        };
    }

    getOutputPosition(node, outputIndex) {
        return {
            x: node.x + node.width,
            y: node.y + 45 + outputIndex * 25
        };
    }

    startConnection(node) {
        const outputInfo = this.isOnNodeOutput(node, this.lastMouseX, this.lastMouseY);
        if (outputInfo) {
            this.draggingConnection = true;
            this.connectionStart = this.getOutputPosition(node, outputInfo.index);
            this.connectionSource = {
                node: node,
                index: outputInfo.index,
                type: outputInfo.type
            };
        }
    }

    completeConnection(node, portType) {
        if (portType === 'input') {
            const inputInfo = this.isOnNodeInput(node, this.lastMouseX, this.lastMouseY);
            if (inputInfo) {
                // Check if we're connecting compatible types or if target accepts 'any'
                if (inputInfo.type === 'any' || this.connectionSource.type === inputInfo.type || this.connectionSource.type === 'any') {
                    // Check if input already has a connection
                    const existingConnection = this.connections.find(conn => 
                        conn.to.node.id === node.id && conn.to.index === inputInfo.index);
                    
                    if (existingConnection) {
                        // Remove existing connection
                        this.connections = this.connections.filter(conn => 
                            !(conn.to.node.id === node.id && conn.to.index === inputInfo.index));
                    }
                    
                    // Add new connection
                    this.connections.push({
                        from: this.connectionSource,
                        to: {
                            node: node,
                            index: inputInfo.index,
                            type: inputInfo.type
                        }
                    });
                }
            }
        }
        
        // Reset connection state
        this.draggingConnection = false;
        this.connectionStart = null;
        this.connectionEnd = null;
        this.connectionSource = null;
        
        this.render();
    }

    cancelConnection() {
        this.draggingConnection = false;
        this.connectionStart = null;
        this.connectionEnd = null;
        this.connectionSource = null;
        this.render();
    }

    // Update mouse position tracking
    set lastMouseX(x) {
        this._lastMouseX = x;
    }
    
    get lastMouseX() {
        return this._lastMouseX || 0;
    }
    
    set lastMouseY(y) {
        this._lastMouseY = y;
    }
    
    get lastMouseY() {
        return this._lastMouseY || 0;
    }
}


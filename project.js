import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Texture, Scene,
} = tiny;

class Cube_Outline extends Shape {
    constructor() {
        super("position", "color");
        //  TODO (Requirement 5).
        // When a set of lines is used in graphics, you should think of the list entries as
        // broken down into pairs; each pair of vertices will be drawn as a line segment.
        // Note: since the outline is rendered with Basic_shader, you need to redefine the position and color of each vertex
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [1, -1, -1], [1, 1, -1], [1, 1, -1], [-1, 1, -1], [-1, 1, -1], [-1, -1, -1], // z = -1
            [-1, -1,  1], [1, -1,  1], [1, -1,  1], [1, 1,  1], [1, 1,  1], [-1, 1,  1], [-1, 1,  1], [-1, -1,  1], // z = 1
            [-1, -1, -1], [-1, -1, 1], [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1,  1], [-1, 1, -1], [-1, 1, 1]
        );
        this.arrays.color = Vector3.cast(
            color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1),
            color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1),
            color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1), color(1,1,1,1));
        this.indices = false;
    }
}

class Tetrahedron_Shift extends Shape {
    // **Tetrahedron** demonstrates flat vs smooth shading (a boolean argument selects
    // which one).  It is also our first 3D, non-planar shape.  Four triangles share
    // corners with each other.  Unless we store duplicate points at each corner
    // (storing the same position at each, but different normal vectors), the lighting
    // will look "off".  To get crisp seams at the edges we need the repeats.
    constructor() {
        super("position", "normal");
        const a = 1 / Math.sqrt(3);
        this.arrays.position = Vector3.cast(
            [1, 0, 0], [-1, 1, 0], [-1, -1, 1],  // front
            [1, 0, 0], [-1, -1, -1], [-1, 1, 0], // back
            [1, 0, 0], [-1, -1, 1], [-1, -1, -1], // bottom
            [-1, 1, 0], [-1, -1, -1], [-1, -1, 1]);// left

        this.arrays.normal = Vector3.cast(   // TODO: FIX
            [a, a, a], [a, a, a], [a, a, a],
            [a, a, -a], [a, a, -a], [a, a, -a],
            [0, -1, 0], [0, -1, 0], [0, -1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]
        );

        this.indices.push(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
    }
}
    

class Line extends Shape{
    constructor() {
        super("position", "color");
        //  TODO (Requirement 5).
        // When a set of lines is used in graphics, you should think of the list entries as
        // broken down into pairs; each pair of vertices will be drawn as a line segment.
        // Note: since the outline is rendered with Basic_shader, you need to redefine the position and color of each vertex    
        this.arrays.position = Vector3.cast(
            [0, 0, 0], [0, 0, 1]);
        this.arrays.color = Vector3.cast(
            color(1,1,1,1), color(1,1,1,1)
            );
        this.indices = false;
    }
}


var separationMultiplier = 1.5;
var alignmentMultiplier = 1;
var cohesionMultiplier = 1;
const maxWorldX = 40;
const maxWorldY = 20;
const maxWorldZ = 20;
const birdRadius = 0.8;
const spawnRadius = 5;

const lightColor = color(1, 1, 1, 1);
const sunriseColor = color(1, 125.0/255.0, 134.0/255.0);
const noonColor = color(1, 1, 1, 1);
const nightColor = color(21.0 / 255.0, 23.0/255.0, 48.0/255.0);

class Bird {
    constructor() {
        this.maxSpeed = birdRadius * 16; // per second
        this.maxForceComponent = this.maxSpeed * 0.02; // per second
        this.maxForceMultiplier = 1;
        this.attentionRadius = birdRadius * 3;
        this.position = vec3(spawnRadius * Math.random() - spawnRadius / 2 + maxWorldX / 2, spawnRadius * Math.random() - spawnRadius / 2 + maxWorldY / 2, spawnRadius * Math.random() - spawnRadius / 2 + maxWorldZ / 2); // initialized at random position in the middle of the world
        this.velocity = vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalized().times(this.maxSpeed); // initialized with random velocity
        this.acceleration = vec3(0, 0, 0);
    }

    // updates position, velocity, and acceleration
    updateMotion(birds, dt) {
        // calculate force
        this.acceleration = this.calculateAllForce(birds);
        this.velocity = this.velocity.plus(this.acceleration);
        if (this.velocity.norm() > this.maxSpeed) {
            this.velocity = this.velocity.normalized().times(this.maxSpeed);
        }
        this.position = this.position.plus(this.velocity.times(dt));
        // wrap-around
        this.position = vec3((this.position[0] + maxWorldX) % maxWorldX, (this.position[1] + maxWorldY) % maxWorldY, (this.position[2] + maxWorldZ) % maxWorldZ);
    }

    calculateAllForce(birds) {
        let totalMultiplier = 0;
        if (separationMultiplier > 0 || alignmentMultiplier > 0 || cohesionMultiplier > 0) {
            totalMultiplier = separationMultiplier + alignmentMultiplier + cohesionMultiplier;
        }
        if (totalMultiplier === 0) { // no force at all
            return vec(0, 0, 0);
        }
        let force = vec3(0, 0, 0);
        force = force.plus(this.getSeparationForce(birds).times(separationMultiplier / totalMultiplier * this.maxForceMultiplier))
                     .plus(this.getAlignmentForce(birds).times(alignmentMultiplier / totalMultiplier * this.maxForceMultiplier))
                     .plus(this.getCohesionForce(birds).times(cohesionMultiplier / totalMultiplier * this.maxForceMultiplier));
        return force;
    }

    getSeparationForce(birds) {
        let desiredSeparation = this.attentionRadius;
        let inNeighborhood = 0;
        let force = vec3(0, 0, 0);
        for (let i = 0; i < birds.length; i++) {
            let d = this.position.minus(birds[i].position).norm();
            if ((d > 0) && d < desiredSeparation) {
                let diff = this.position.minus(birds[i].position);
                force = force.plus(diff.normalized().times(1 / (d / this.attentionRadius * 25))); // scale d up so that the slope isn't so steep
                inNeighborhood++;
            }
        }
        // average the separation
        if (inNeighborhood > 0) {
            force = force.times(1 / inNeighborhood);
        }
        if (force.norm() > 0) {
            force = force.normalized().times(this.maxSpeed).minus(this.velocity);
            if (force.norm() > this.maxForceComponent) {
                force = force.normalized().times(this.maxForceComponent);
            }
        }
        return force;
    }

    getAlignmentForce(birds) {
        let neighborhoodRadius = this.attentionRadius * 2;
        let cumulativeVelocity = vec3(0, 0, 0);
        let inNeighborhood = 0;
        for (let i = 0; i < birds.length; i++) {
            let d = this.position.minus(birds[i].position).norm();
            if ((d > 0) && (d < neighborhoodRadius)){
                cumulativeVelocity = cumulativeVelocity.plus(birds[i].velocity);
                inNeighborhood++;
            }
        }
        if (inNeighborhood > 0) {
            cumulativeVelocity = cumulativeVelocity.times(1 / inNeighborhood);
            cumulativeVelocity = cumulativeVelocity.normalized().times(this.maxSpeed);
            let force = cumulativeVelocity.minus(this.velocity);
            if (force.norm() > this.maxForceComponent) {
                force = force.normalized().times(this.maxForceComponent);
            }
            return force;
        }
        return vec3(0, 0, 0);
    }

    getCohesionForce(birds) {
        let neighborhoodRadius = this.attentionRadius * 2;
        let cumulativePosition = vec3(0, 0, 0);
        let inNeighborhood = 0;
        for (let i = 0; i < birds.length; i++) {
            let d = this.position.minus(birds[i].position).norm();
            if ((d > 0) && (d < neighborhoodRadius)){
                cumulativePosition = cumulativePosition.plus(birds[i].position);
                inNeighborhood++;
            }
        }
        if (inNeighborhood > 0) {
            let averagePosition = cumulativePosition.times(1 / inNeighborhood);
            let force = averagePosition.minus(this.position);
            force = force.normalized().times(this.maxSpeed).minus(this.velocity);
            if (force.norm() > this.maxForceComponent) {
                force = force.normalized().times(this.maxForceComponent);
            }
            return force;
        }
        return vec3(0, 0, 0);
    }
}

class Tree {
    constructor() {
        this.attentionRadius = birdRadius * 3;
        this.position = vec3(0, 0, 0); // initialized at random position in the middle of the world
    }
}

export class Project extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            world_outline: new Cube_Outline(),
            bird: new defs.Subdivision_Sphere(4),
            bird_shape: new (defs.Tetrahedron.prototype.make_flat_shaded_version())(true),
            bird_shape_noflat: new defs.Tetrahedron(),
            light: new defs.Subdivision_Sphere(4),
            new_bird: new Tetrahedron_Shift(),
            cone_bird: new defs.Closed_Cone(10, 10),
            line_segment: new Line(),
            floor: new defs.Square(),
            bird_model: new Shape_From_File("assets/Bird.obj"),
            tree_1: new Shape_From_File("assets/Tree.obj"),
            tree_2: new Shape_From_File("assets/Tree_2.obj"),
            tree_3: new Shape_From_File("assets/Tree_3.obj"),
            tree_4: new Shape_From_File("assets/Tree_4.obj"),
            tree_5: new Shape_From_File("assets/Tree_5.obj"),
            tree_6: new Shape_From_File("assets/Tree_6.obj"),
        };

        // *** Materials
        this.materials = {
            white: new Material(new defs.Basic_Shader()),
            test: new Material(new defs.Phong_Shader(), {
                ambient: 0.15,
                diffusivity: 1.0,
                specularity: 0,
                color: hex_color("#ffffff")
            }),
        }

        // Bump map
        this.bumps = {
            bird: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/1846471280_1024x1024_6195987693227547908.png")
            }),
            tree_1: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/2481502052_2048x2048_6195987693227547908.png")
            }),
            tree_2: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/220389868_2048x2048_6195987693227547908.png")
            }),
            tree_3: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/1350945960_2048x2048_6195987693227547908.png")
            }),
            tree_4: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/3384801072_2048x2048_6195987693227547908.png")
            }),
            tree_5: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/110997054_2048x2048_6195987693227547908.png")
            }),
            tree_6: new Material(new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .3,
                diffusivity: .5,
                specularity: .5,
                texture: new Texture("assets/3275408258_2048x2048_6195987693227547908.png")
            }),
        };

        this.initial_camera_location = Mat4.look_at(vec3(maxWorldX / 2, maxWorldY * 1.5, maxWorldZ * 3), vec3(maxWorldX/2, maxWorldY/2, maxWorldZ/2), vec3(0, 1, 0));
        this.birds = Array(25);
        for (let i = 0; i < this.birds.length; i++) {
            this.birds[i] = new Bird();
        }
        this.trees = Array();
        this.paused = false;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Increase Separation", ["Control", "1"], () => {
            separationMultiplier = Math.min(separationMultiplier + 0.25, 10);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.key_triggered_button("Decrease Separation", ["Control", "2"], () => {
            separationMultiplier = Math.max(separationMultiplier - 0.25, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Increase Alignment", ["Control", "3"], () => {
            alignmentMultiplier = Math.min(alignmentMultiplier + 0.25, 10);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.key_triggered_button("Decrease Alignment", ["Control", "4"], () => {
            alignmentMultiplier = Math.max(alignmentMultiplier - 0.25, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Increase Cohesion", ["Control", "5"], () => {
            cohesionMultiplier = Math.min(cohesionMultiplier + 0.25, 10);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Decrease Cohesion", ["Control", "6"], () => {
            cohesionMultiplier = Math.max(cohesionMultiplier - 0.25, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.key_triggered_button("Add bird", ["Control", "z"], () => {
            this.birds.push(new Bird());
            console.log('Bird added');
        });
        this.key_triggered_button("Remove bird", ["Control", "x"], () => {
            this.birds.pop();
            console.log('Bird removed');
        });
        this.key_triggered_button("Pause", ["Control", " "], () => {
            this.paused = !this.paused;
        });


        this.key_triggered_button("Add Tree", ["Shift", "T"], () => {
            let newTree = new Tree();
            let shapeKeys = Object.keys(this.shapes);
            // let treeNum = Math.random() * 6 << 0;
            let treeNum = 0;
            newTree.shape = this.shapes[shapeKeys[10 + treeNum]];
            let bumpKeys = Object.keys(this.bumps);
            newTree.bump = this.bumps[bumpKeys[1 + treeNum]];
            this.trees.push(newTree);

            console.log(treeNum+1);
        })
    }

    rotateAlign(v1, v2)
    {
        // https://gist.github.com/kevinmoran/b45980723e53edeb8a5a43c49f134724
        let axis = v1.cross(v2);
        let cosA = v1.dot(v2);
        let k = 1.0 / (1.0 + cosA);
        let result = Vector.cast([(axis[0] * axis[0] * k) + cosA, (axis[1] * axis[0] * k) - axis[2], (axis[2] * axis[0] * k) + axis[1], 0],
        [(axis[0] * axis[1] * k) + axis[2], (axis[1] * axis[1] * k) + cosA, (axis[2] * axis[1] * k) - axis[0], 0],
        [(axis[0] * axis[2] * k) - axis[1], (axis[1] * axis[2] * k) + axis[0], (axis[2] * axis[2] * k) + cosA, 0],
        [0, 0, 0, 1]
        );
    
        return result;
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls(maxWorldX, maxWorldY, maxWorldZ));
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Create Planets (Requirement 1)
        // this.shapes.[XXX].draw([XXX]) // <--example

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(1, 1, 1, 0);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, lightColor, 10)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let root = Mat4.identity();
        
        this.shapes.world_outline.draw(context, program_state, root.times(Mat4.scale(maxWorldX / 2, maxWorldY / 2, maxWorldZ / 2)).times(Mat4.translation(1, 1, 1)), this.materials.white, "LINES");
       
       let sun_pos =  root.times(Mat4.rotation(t, 1, 0, 0))
       .times(Mat4.translation(0, 0, 50));
       
        this.shapes.light.draw(context, program_state, sun_pos, this.materials.test.override({color: lightColor, diffusivity: 0.0, ambient: 1.0}));
        //this.materials.test.replace({ambient: .5});
        // draw the floor
        this.shapes.floor.draw(context, program_state, root
            .times(Mat4.rotation(3*Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(maxWorldX / 2, maxWorldY / 2, 1))
            .times(Mat4.translation(1, -1, 0)),
            this.materials.test);

        // draw the birds
        this.birds.forEach(bird => {

            let birdBasis = root
            .times(Mat4.scale(birdRadius, birdRadius, birdRadius))
            .times(Mat4.translation(bird.position[0] / birdRadius, bird.position[1] / birdRadius, bird.position[2] / birdRadius))
            .times(this.rotateAlign(vec3(0, 0, 1), vec3(bird.velocity[0], bird.velocity[1], bird.velocity[2]).normalized()));
            // console.log(bird.position);
            this.shapes.bird_model.draw(context, program_state, birdBasis, this.bumps.bird);
            if (!this.paused) {
                bird.updateMotion(this.birds, dt);
            }
            
            //this.shapes.line_segment.draw(context, program_state, birdBasis.times(Mat4.scale(2, 2, 2)), this.materials.white, "LINES");
        });

        // draw the trees
        this.trees.forEach(tree => {
            let treeBasis = root;
            tree.shape.draw(context, program_state, treeBasis, tree.bump);
        })
    }
}
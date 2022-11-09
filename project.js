import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
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

var separationMultiplier = 2;
var alignmentMultiplier = 0;
var cohesionMultiplier = 0;
const maxWorldX = 40;
const maxWorldY = 20;
const maxWorldZ = 20;
const birdRadius = 1;
const spawnRadius = 5;
const lightColor = hex_color("#f5d20c");

class Bird {
    constructor() {
        this.position = vec3(spawnRadius * Math.random() - spawnRadius / 2 + maxWorldX / 2, spawnRadius * Math.random() - spawnRadius / 2 + maxWorldY / 2, spawnRadius * Math.random() - spawnRadius / 2 + maxWorldZ / 2); // initialized at random position in the middle of the world
        this.velocity = vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5); // initialized with random velocity
        this.acceleration = vec3(0, 0, 0);
        this.maxForce = 0.03;
        this.maxSpeed = 0.1;
        this.radius = 2;
    }

    // updates position, velocity, and acceleration
    updateMotion(birds) {
        // calculate force
        let force = this.calculateAllForce(birds);
        this.acceleration = this.acceleration.plus(force);
        this.velocity = this.velocity.plus(this.acceleration);
        if (this.velocity.norm() > this.maxSpeed) {
            this.velocity = this.velocity.normalized().times(this.maxSpeed);
        }
        this.position = this.position.plus(this.velocity);
        this.position = vec3((this.position[0] + maxWorldX) % maxWorldX, (this.position[1] + maxWorldY) % maxWorldY, (this.position[2] + maxWorldZ) % maxWorldZ);
        this.acceleration = vec3(0, 0, 0); // zero it out each cycle
    }

    calculateAllForce(birds) {
        let force = vec3(0, 0, 0);
        force = force.plus(this.getSeparationForce(birds).times(separationMultiplier))
                     .plus(this.getAlignmentForce(birds).times(alignmentMultiplier))
                     .plus(this.getCohesionForce(birds).times(cohesionMultiplier));
        return force;
    }

    getSeparationForce(birds) {
        let desiredSeparation = 1;
        let inNeighborhood = 0;
        let force = vec3(0, 0, 0);
        for (let i = 0; i < birds.length; i++) {
            let d = this.position.minus(birds[i].position).norm();
            if ((d > 0) && d < desiredSeparation) {
                let diff = this.position.minus(birds[i].position);
                force = force.plus(diff.normalized().times(1 / d));
                inNeighborhood++;
            }
        }
        // average the separation
        if (inNeighborhood > 0) {
            force = force.times(1 / inNeighborhood);
        }
        if (force.norm() > 0) {
            force = force.normalized().times(this.maxSpeed).minus(this.velocity);
            if (force.norm() > this.maxForce) {
                force = force.normalized().times(this.maxForce);
            }
        }
        return force;
    }

    getAlignmentForce(birds) {
        let neighborhoodRadius = 3;
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
            if (force.norm() > this.maxForce) {
                force = force.normalized().times(this.maxForce);
            }
            return force;
        }
        return vec3(0, 0, 0);
    }

    getCohesionForce(birds) {
        let neighborhoodRadius = 3;
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
            if (force.norm() > this.maxForce) {
                force = force.normalized().times(this.maxForce);
            }
            return force;
        }
        return vec3(0, 0, 0);
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
        };

        // *** Materials
        this.materials = {
            white: new Material(new defs.Basic_Shader()),
            test: new Material(new defs.Phong_Shader(), {ambient: 0.15, diffusivity: 1.0, specularity: 0, color: hex_color("#ffffff")})
        }

        this.initial_camera_location = Mat4.look_at(vec3(maxWorldX / 2, maxWorldY * 1.5, maxWorldZ * 3), vec3(maxWorldX/2, maxWorldY/2, maxWorldZ/2), vec3(0, 1, 0));
        this.birds = Array(25);
        for (let i = 0; i < this.birds.length; i++) {
            this.birds[i] = new Bird();
        }
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Increase Separation", ["Control", "1"], () => {
            separationMultiplier = Math.min(separationMultiplier + 0.5, 10);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.key_triggered_button("Decrease Separation", ["Control", "2"], () => {
            separationMultiplier = Math.max(separationMultiplier - 0.5, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Increase Alignment", ["Control", "3"], () => {
            alignmentMultiplier = Math.min(alignmentMultiplier + 0.5, 10);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.key_triggered_button("Decrease Alignment", ["Control", "4"], () => {
            alignmentMultiplier = Math.max(alignmentMultiplier - 0.5, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Increase Cohesion", ["Control", "5"], () => {
            cohesionMultiplier = Math.min(cohesionMultiplier + 0.5, 10);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Decrease Cohesion", ["Control", "6"], () => {
            cohesionMultiplier = Math.max(cohesionMultiplier - 0.5, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Create Planets (Requirement 1)
        // this.shapes.[XXX].draw([XXX]) // <--example

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(maxWorldX/2, maxWorldY/2, maxWorldZ/2, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, lightColor, 1000)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let root = Mat4.identity();
        
        this.shapes.world_outline.draw(context, program_state, root.times(Mat4.scale(maxWorldX / 2, maxWorldY / 2, maxWorldZ / 2)).times(Mat4.translation(1, 1, 1)), this.materials.white, "LINES");
       
        this.shapes.light.draw(context, program_state, root.times(Mat4.translation(maxWorldX/2, maxWorldY/2, maxWorldZ/2)), this.materials.test.override({color: lightColor, diffusivity: 0.0, ambient: 1.0}));
       
        // draw the birds
        this.birds.forEach(bird => {
            let birdBasis = root
            .times(Mat4.scale(birdRadius, birdRadius, birdRadius))
            .times(Mat4.translation(bird.position[0] / birdRadius, bird.position[1] / birdRadius, bird.position[2] / birdRadius))
            //.times(Mat4.rotation(Math.tan(bird.velocity[1]/bird.velocity[0]), 0, 0, 1))
            //.times(Mat4.rotation(Math.tan(bird.velocity[2]/bird.velocity[0]), 0, 1, 0));
            // console.log(bird.position);
            this.shapes.bird_shape.draw(context, program_state, birdBasis, this.materials.test);
            bird.updateMotion(this.birds);
        });
    }
}
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
const birdRadius = 0.5;
const spawnRadius = 5;

const lightColor = color(1, 1, 1, 1);
const sunriseColor = hex_color("#e77a7c");  // 6, 18 sec
const noonColor = hex_color("#f0f7ff");                      // 12 sec
const nightColor = hex_color("#1e2036");   // 0, 24 sec

class Bird {
    constructor() {
        this.maxSpeed = birdRadius * 16; // per second
        this.maxForceComponent = this.maxSpeed * 0.02; // per second
        this.maxForceMultiplier = 1;
        this.attentionRadius = birdRadius * 3;
        this.position = vec3(spawnRadius * Math.random() - spawnRadius / 2 + maxWorldX / 2, spawnRadius * Math.random() - spawnRadius / 2 + maxWorldY / 2, spawnRadius * Math.random() - spawnRadius / 2 + maxWorldZ / 2); // initialized at random position in the middle of the world
        // this.position = vec3(maxWorldX/2, maxWorldY/2, maxWorldZ/2);
        // this.velocity = vec3(this.maxSpeed, 0, 0);
        this.velocity = vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalized().times(this.maxSpeed); // initialized with random velocity
        this.acceleration = vec3(0, 0, 0);
    }

    // updates position, velocity, and acceleration
    updateMotion(birds, obstacles, dt) {
        // calculate force
        this.acceleration = this.calculateAllForce(birds, obstacles);
        this.velocity = this.velocity.plus(this.acceleration);
        if (this.velocity.norm() > this.maxSpeed) {
            this.velocity = this.velocity.normalized().times(this.maxSpeed);
        }
        this.position = this.position.plus(this.velocity.times(dt));
        // wrap-around
        this.position = vec3((this.position[0] + maxWorldX) % maxWorldX, (this.position[1] + maxWorldY) % maxWorldY, (this.position[2] + maxWorldZ) % maxWorldZ);
    }

    calculateAllForce(birds, obstacles) {
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
                     .plus(this.getCohesionForce(birds).times(cohesionMultiplier / totalMultiplier * this.maxForceMultiplier))
                     .plus(this.getSteeringForce(obstacles));
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

    getIntersectionOfTwoCircles2D(x1, y1, r1, x2, y2, r2) {
        var centerdx = x1 - x2;
        var centerdy = y1 - y2;
        var R = Math.sqrt(centerdx * centerdx + centerdy * centerdy);
        if (!(Math.abs(r1 - r2) <= R && R <= r1 + r2)) { // no intersection
            return []; // empty list of results
        }
        // intersection(s) should exist
        var R2 = R*R;
        var R4 = R2*R2;
        var a = (r1*r1 - r2*r2) / (2 * R2);
        var r2r2 = (r1*r1 - r2*r2);
        var c = Math.sqrt(2 * (r1*r1 + r2*r2) / R2 - (r2r2 * r2r2) / R4 - 1);
        var fx = (x1+x2) / 2 + a * (x2 - x1);
        var gx = c * (y2 - y1) / 2;
        var ix1 = fx + gx;
        var ix2 = fx - gx;

        var fy = (y1+y2) / 2 + a * (y2 - y1);
        var gy = c * (x1 - x2) / 2;
        var iy1 = fy + gy;
        var iy2 = fy - gy
        return [vec(ix1, iy1), vec(ix2, iy2)];
    }
    
    getSteeringForce(trees) {
        let validCollisions = [];
        for (let i = 0; i < trees.length; i++) {
            // check if the bird would collide with the sides of the tree
            let c_x = this.position[0] - trees[i].position[0];
            let c_z = this.position[2] - trees[i].position[2];
            let a = (this.velocity[0] ** 2 + this.velocity[2] ** 2);
            let b = 2 * this.velocity[0] * c_x + 2 * this.velocity[2] * c_z;
            let c = c_x ** 2 + c_z ** 2 - trees[i].visibleRadius ** 2;
            let discriminant = (b ** 2 - 4 * a * c);
            if (discriminant >= 0 && a > 0) { // there's a chance of collision
                let alpha_1 = (- b + Math.sqrt(discriminant)) / (2 * a);
                let collision_point_1 = this.position.plus(this.velocity.times(alpha_1));
                if ((Math.abs(collision_point_1[1] - trees[i].position[1]) <= trees[i].height && alpha_1 >= 0)) {
                    validCollisions.push({ alpha: alpha_1, collision_type: "side", collision_point: collision_point_1, collision_entity: trees[i] });
                }
                let alpha_2 = (- b - Math.sqrt(discriminant)) / (2 * a);
                let collision_point_2 = this.position.plus(this.velocity.times(alpha_2));
                if ((Math.abs(collision_point_2[1] - trees[i].position[1]) <= trees[i].height && alpha_2 >= 0)) { // there is a collision if the bird continues its current direction
                    validCollisions.push({ alpha: alpha_1, collision_type: "side", collision_point: collision_point_2, collision_entity: trees[i] });
                }
            }
            
            // check if bird would collide with the two bases
            let y_h = trees[i].position[1] + trees[i].height / 2;
            let alpha_3 = (y_h - this.position[1]) / this.velocity[1];
            let collision_point_3 = this.position.plus(this.velocity.times(alpha_3));
            if (collision_point_3.minus(vec3(trees[i].position[0], y_h, trees[i].position[2])).norm() < trees[i].visibleRadius && alpha_3 >= 0) {
                validCollisions.push({ alpha: alpha_3, collision_type: "base", collision_point: collision_point_3, collision_entity: trees[i] });
            }
            let y_l = trees[i].position[1] - trees[i].height / 2;
            let alpha_4 = (y_l - this.position[1]) / this.velocity[1];
            let collision_point_4 = this.position.plus(this.velocity.times(alpha_4));
            if (collision_point_4.minus(vec3(trees[i].position[0], y_l, trees[i].position[2])).norm() < trees[i].visibleRadius && alpha_4 >= 0) {
                validCollisions.push({ alpha: alpha_4, collision_type: "base", collision_point: collision_point_4, collision_entity: trees[i] });
            }
        }
        // find the smallest alpha (closest collision)
        validCollisions.sort((a, b) => a.alpha - b.alpha);
        if (validCollisions.length === 0) {
            return vec3(0, 0, 0);
        }
        let relevantCollision = validCollisions[0];
        let idealDistance = relevantCollision.collision_entity.visibleRadius * 1.7;
        let birdAwareDistance = idealDistance * 3;
        if (relevantCollision.collision_point.minus(this.position).norm() > birdAwareDistance) {
            // console.log("collision too far, no reaction yet");
            return vec3(0, 0, 0);
        } else if (relevantCollision.collision_type === "base") {
            console.log("there's a collision with base and i'm not sure what to do yet");
            let force = vec3(0, - this.velocity[1], 0);
            if (force.norm() > this.maxForceComponent) {
                force = force.normalized().times(this.maxForceComponent);
            }
            return force;
        } else { // if we are colliding with the side
            let birdPositionXZ = vec(this.position[0], this.position[2]);
            let treeCenterXZ = vec(relevantCollision.collision_entity.position[0], relevantCollision.collision_entity.position[2]);
            let birdTreeDistXZ = birdPositionXZ.minus(treeCenterXZ).norm()
            let length = 0;
            if (birdTreeDistXZ === 0) {
                return vec3(0, 0, 0);
            } else if (birdTreeDistXZ < idealDistance) {
                length = Math.sqrt(birdTreeDistXZ ** 2 + idealDistance ** 2);
            } else {
                length = Math.sqrt(birdTreeDistXZ ** 2 - idealDistance ** 2);
            }
            
            let idealPoints = this.getIntersectionOfTwoCircles2D(relevantCollision.collision_entity.position[0], relevantCollision.collision_entity.position[2], idealDistance, this.position[0], this.position[2], length);
            if (idealPoints.length === 0) {
                console.log("Something went wrong in calculating circle intersection");            
                return vec3(0, 0, 0);
            } else {
                // chose the point that is easiest to head to
                let vec_to_point_1 = idealPoints[0].minus(birdPositionXZ);
                let vec_to_point_2 = idealPoints[1].minus(birdPositionXZ);
                let birdVelocityXZ = vec(this.velocity[0], this.velocity[2]);
                let headTo;
                if (vec_to_point_1.dot(birdVelocityXZ) >= vec_to_point_2.dot(birdVelocityXZ)) {
                    headTo = idealPoints[0];
                } else {
                    headTo = idealPoints[1];
                }
                let force = vec3(headTo[0], relevantCollision.collision_point[1], headTo[1]).minus(this.position);
                force = force.normalized().times(this.maxSpeed).minus(this.velocity);
                if (force.norm() > this.maxForceComponent) {
                    force = force.normalized().times(this.maxForceComponent);
                }
                // console.log("steering force = " + force);
                return force;
            }
        }
        return vec3(0, 0, 0);
    }
}

class Tree {
    constructor() {
        this.position = vec3(0, 0, 0); // initialized at (0, 0, 0)
        this.height = 4;
        this.radius = 2; // this doesn't actually get displayed, 
        // constant
        this.xVisibleLowerBound = -1.6;
        this.xVisibleUpperBound = 1.6;
        this.yVisibleLowerBound = -1.6;
        this.yVisibleUpperBound = 1.6;
        this.zVisibleLowerBound = -1.6;
        this.zVisibleUpperBound = 1.6;
        this.boundingBoxCenter = [(this.xVisibleLowerBound + this.xVisibleUpperBound) / 2, (this.yVisibleLowerBound + this.yVisibleUpperBound) / 2, (this.zVisibleLowerBound + this.zVisibleUpperBound) / 2];
        this.boundingBoxScale = [(-this.xVisibleLowerBound + this.xVisibleUpperBound) / 2, (-this.yVisibleLowerBound + this.yVisibleUpperBound) / 2, (-this.zVisibleLowerBound + this.zVisibleUpperBound) / 2];
        this.visibleRadius = this.radius * (this.boundingBoxScale[0] + this.boundingBoxScale[2]) / 2;
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
            cloud: new Shape_From_File("assets/Cloud.obj"),
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
            cloud: new Material (new defs.Fake_Bump_Map(1), {
                color: color(.5, .5, .5, 1),
                ambient: .6,
                diffusivity: .7,
                specularity: .7,
                texture: new Texture("assets/3160191108_2048x2048_6195987693227547908.png")
            }),
        };

        this.initial_camera_location = Mat4.look_at(vec3(maxWorldX / 2, maxWorldY * 1.5, maxWorldZ * 3), vec3(maxWorldX/2, maxWorldY/2, maxWorldZ/2), vec3(0, 1, 0));
        this.birds = Array(25);
        for (let i = 0; i < this.birds.length; i++) {
            this.birds[i] = new Bird();
        }
        this.trees = Array();
        this.paused = false;
        this.placingTree = false;
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
        this.key_triggered_button("Decrease Cohesion", ["Control", "6"], () => {
            cohesionMultiplier = Math.max(cohesionMultiplier - 0.25, 0);
            console.log(`separationMultiplier = ${separationMultiplier}, alignmentMultiplier = ${alignmentMultiplier}, cohesionMultiplier = ${cohesionMultiplier}`);
        });
        this.new_line();
        this.key_triggered_button("Add bird", ["Control", "z"], () => {
            this.birds.push(new Bird());
            console.log('Bird added');
        });
        this.key_triggered_button("Remove bird", ["Control", "x"], () => {
            this.birds.pop();
            console.log('Bird removed');
        });
        this.new_line();
        this.key_triggered_button("Pause", ["Control", " "], () => {
            this.paused = !this.paused;
        });

        this.new_line();
        this.new_line();

        this.key_triggered_button("Add Tree", ["Shift", "T"], () => {
            let newTree = new Tree();
            newTree.position = vec3(0, 0, 0);
            let shapeKeys = Object.keys(this.shapes);
            let treeNum = Math.random() * 6 << 0;
            newTree.shape = this.shapes[shapeKeys[10 + treeNum]];
            let bumpKeys = Object.keys(this.bumps);
            newTree.bump = this.bumps[bumpKeys[1 + treeNum]];
            this.newTree = newTree;

            this.placingTree = !this.placingTree;
        });
        this.new_line();
        this.key_triggered_button("Move tree +y", ["ArrowUp"], () => {
            if (this.placingTree && this.newTree.position[1] + 1 + this.newTree.height / 2 < maxWorldY) {
                console.log("moving +y");
                this.newTree.position[1] += 1;
                console.log(this.newTree.position);
            }
        });
        this.key_triggered_button("Move tree -y", ["ArrowDown"], () => {
            if (this.placingTree && this.newTree.position[1] - 1 - this.newTree.height / 2 > 0) {
                console.log("moving -y");
                this.newTree.position[1] -= 1;
                console.log(this.newTree.position);
            }
        });
        this.new_line();
        this.key_triggered_button("Move tree -x", ["ArrowLeft"], () => {
            if (this.placingTree && this.newTree.position[0] - 1 - this.newTree.radius / 2 > 0) {
                console.log("moving -x");
                this.newTree.position[0] -= 1;
                console.log(this.newTree.position);
            }
        });
        this.key_triggered_button("Move tree +x", ["ArrowRight"], () => {
            if (this.placingTree && this.newTree.position[0] + 1 + this.newTree.radius / 2 < maxWorldX) {
                console.log("moving +x");
                this.newTree.position[0] += 1;
                console.log(this.newTree.position);
            }
        });
        this.new_line();
        this.key_triggered_button("Move tree +z", ["."], () => {
            if (this.placingTree && this.newTree.position[2] + 1 + this.newTree.radius / 2 < maxWorldZ) {
                console.log("moving +z");
                this.newTree.position[2] += 1;
                console.log(this.newTree.position);
            }
        });
        this.key_triggered_button("Move tree -z", [","], () => {
            if (this.placingTree && this.newTree.position[2] - 1 - this.newTree.radius / 2 > 0) {
                console.log("moving -z");
                this.newTree.position[2] -= 1;
                console.log(this.newTree.position);
            }
        });
        this.new_line();
        this.key_triggered_button("Confirm tree", ["Enter"], () => {
            if (this.placingTree) {
                console.log("placing tree");
                this.trees.push(this.newTree);
                this.placingTree = false;
                this.newTree = null;
            }
        });
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


        const light_position = vec4(1, 1, 1, 0);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, lightColor, 10)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let root = Mat4.identity();

        if (this.paused || this.placingTree) {
            program_state.animation_time = this.pausedTime;
        }
        else {
            this.pausedTime = program_state.animation_time;
        }
        
        this.shapes.world_outline.draw(context, program_state, root.times(Mat4.scale(maxWorldX / 2, maxWorldY / 2, maxWorldZ / 2)).times(Mat4.translation(1, 1, 1)), this.materials.white, "LINES");
       
        let sun_pos =  root.times(Mat4.rotation(-2*Math.PI*(1/24.0)*(t%24), 1, 0, 0))
        .times(Mat4.translation(0, 0, 50 - (maxWorldZ/2)));
       
        this.shapes.light.draw(context, program_state, sun_pos, this.materials.test.override({color: lightColor, diffusivity: 0.0, ambient: 1.0}));
        
        // fog and ambient day night cycle
        const time = (t + 6) % 24;  // start at sunrise
        //this.materials.test.replace({fogColor: color(.8, 0.9, 1, 1)});
        if (time >= 6 && time < 10) {
            this.materials.test.shader.set_fog_color(sunriseColor.mix(noonColor, (time - 6.0)/4.0 ));
        }
        else if (time >= 10 && time < 16){
            this.materials.test.shader.set_fog_color(noonColor);
        }
        else if (time >= 16 && time < 18){
            this.materials.test.shader.set_fog_color(noonColor.mix(sunriseColor, (time - 16.0)/2.0 ));
        }
        else if (time >= 18 && time < 21){
            this.materials.test.shader.set_fog_color(sunriseColor.mix(nightColor, (time - 18.0)/3.0 ));
        }
        else if (time >= 21 && time < 5){
            this.materials.test.shader.set_fog_color(nightColor);
        }
        else if (time >= 5 && time < 6){
            this.materials.test.shader.set_fog_color(nightColor.mix(sunriseColor, (time - 5.0)/1.0 ));
        }

        // draw the birds
        this.birds.forEach(bird => {

            let birdBasis = root
            .times(Mat4.scale(birdRadius, birdRadius, birdRadius))
            .times(Mat4.translation(bird.position[0] / birdRadius, bird.position[1] / birdRadius, bird.position[2] / birdRadius))
            .times(this.rotateAlign(vec3(0, 0, 1), vec3(bird.velocity[0], bird.velocity[1], bird.velocity[2]).normalized()));
            // console.log(bird.position);
            this.shapes.bird_model.draw(context, program_state, birdBasis, this.bumps.bird);
            if (!this.paused && !this.placingTree) {
                bird.updateMotion(this.birds, this.trees, dt);
            }
            
            //this.shapes.line_segment.draw(context, program_state, birdBasis.times(Mat4.scale(2, 2, 2)), this.materials.white, "LINES");
        });
        if (this.newTree) {
            let treeBasis = root
                .times(Mat4.translation(this.newTree.position[0], this.newTree.position[1], this.newTree.position[2]))
                .times(Mat4.scale(this.newTree.radius / 2, this.newTree.height / 2, this.newTree.radius / 2));
            this.newTree.shape.draw(context, program_state, treeBasis, this.newTree.bump);
            let boundingBoxBasis = treeBasis.times(Mat4.translation(this.newTree.boundingBoxCenter[0], this.newTree.boundingBoxCenter[1], this.newTree.boundingBoxCenter[2]))
                .times(Mat4.scale(this.newTree.boundingBoxScale[0], this.newTree.boundingBoxScale[1], this.newTree.boundingBoxScale[2]));
            this.shapes.world_outline.draw(context, program_state, boundingBoxBasis, this.materials.white, "LINES");
            this.shapes.cloud.draw(context, program_state, treeBasis.times(Mat4.translation(0.3, -1.6, 0)), this.bumps.cloud);
        }
        // draw the trees
        this.trees.forEach(tree => {
            let treeBasis = root
                .times(Mat4.translation(tree.position[0], tree.position[1], tree.position[2]))
                .times(Mat4.scale(tree.radius / 2, tree.height / 2, tree.radius / 2));
            tree.shape.draw(context, program_state, treeBasis, tree.bump);
            let boundingBoxBasis = treeBasis.times(Mat4.translation(tree.boundingBoxCenter[0], tree.boundingBoxCenter[1], tree.boundingBoxCenter[2]))
                .times(Mat4.scale(tree.boundingBoxScale[0], tree.boundingBoxScale[1], tree.boundingBoxScale[2]));
            this.shapes.world_outline.draw(context, program_state, boundingBoxBasis, this.materials.white, "LINES");
            this.shapes.cloud.draw(context, program_state, treeBasis.times(Mat4.translation(0.3, -1.6, 0)), this.bumps.cloud);
        });

        
    }
}
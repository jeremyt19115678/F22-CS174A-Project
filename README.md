# Fall 2022 CS 174A Project
## Overview
This is the course project for the Fall 2022 offering of CS 174A at UCLA written by Jeffrey Shen, Jeremy Tsai, and Johnny Pan. The vast majority of the code comes from the skeleton code provided by the course instructors; our work are all contained in `project.js`. In the project, we attempt to create an interactive 3D simulation/visualization of the flocking algorithm. It utilizes a version of the WebGL library called Tiny Graphics.

## Functionalities
The birds' movement are determined by the sum of three vectors: separation, cohesion, and alignment. The separation vector compels the bird to move away from its neighbors so that it doesn't run into them. The cohesion vector is meant to simulate the bird's instinct to move towards the majority of its neighbors so that it doesn't get left behind. The alignment vector would mirror the bird's tendency to move in a similar direction and speed as its neighbors. The weight put on each of these vectors can be controlled via buttons on the screen.

## Tasks (Ordered by Priority)
1. Smooth wrap-around:
Right now, when a part of the bird exits the world border, that part of the bird just get drawn out of the world border. We want this part out of the world border to be drawn inside the world border on the other side. Basically, we want the walls to be like a portal.

2. Add clearer description for the multipliers and log them. The total acceleration possible is the same, you can only change the make up of the acceleration (i.e. the percentage each component take up). When they're all zero there are no acceleration (be sure to note that too).

3. Figure out how to highlight depth better:
Right now, it's hard to tell if two birds are colliding or not (i.e. the birds may be colliding, or the birds might have coincidentally formed a straight line with the camera). Potential solution would be adding shadows (and a ground-like surface).

4. Figure out how to avoid stationary obstacles such as the ground or a pillar.

5. Get rid of jittering movement (probably done).
This would probably be done by tuning the max force parameter. Another potential source of error is that the current code assumes each animation frame takes the same time, where in reality we're not sure if we have this guarantee. Or maybe one of the vector calculations are just plain wrong.

6. Perhaps add functionality to change the radius used to calculate separation, alignment, and cohesion.

## Completed Tasks:
1. Indicate the direction of the bird:
The birds are all spheres right now so they look like particles with random motion. It would be nice to have some sort of direction shown graphically (a tetrahedron would probably work for now). Stretch goal would be implement more complicated, bird-like shapes.

2. Better Camera Control:
Set the camera position using [Spherical Coordinates](https://en.wikipedia.org/wiki/Spherical_coordinate_system). Enable the user to set $r,\phi,\theta$ as they wish within some constraint (like those used in the separation, cohesion, and alignment weights).

3. Add control to spawn/despawn more birds.

4. Implement more realistic model of bird, with wings and everything.
const speedScale = 0.33; //multiplier for speeds, just to not go into stupidly tiny fractions
const sizeScale = 1; //make distances larger than displayed; only for gravity calculations, to slow the movement change speedScale

const fps = 60; //frames per second (animation speed)

const tails = true; //if it should draw "tails" of the moving objects
const tail_size = 60; //length of the tail (in frames of animation)

const canvas = document.getElementById("canvas");

const ctx = canvas.getContext("2d");

class SpaceObject{
    constructor({x, y, mass = 1, radius, speedX, speedY}) {
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.radius = radius || 4*mass**0.5;
        this.color = chooseColor(mass);
        this.speedX = speedX;
        this.speedY = speedY;
        this.tail = [];
    };
}

const star = new SpaceObject({
    x: 600,
    y: 400,
    mass: 100,
    speedX: 0,
    speedY: 0,
});

const smallPlanet = new SpaceObject({
    x: 550,
    y: 400,
    mass: 0.5,
    speedX: 0,
    speedY: 5,
});

const largePlanet = new SpaceObject({
    x: 350,
    y: 400,
    speedX: 0,
    speedY: 2,
});

const moon = new SpaceObject({
    x: 340,
    y: 400,
    mass: 0.1,
    speedX: 0,
    speedY: 0.9,
});

const largePlanet2 = new SpaceObject({
    x: 1000,
    y: 400,
    speedX: 0,
    speedY: 1.8,
});

let celestialBodies = [star, smallPlanet, largePlanet, largePlanet2, moon];

function addRandomBodies(){
    for(let i = 1; i <= 20; i++) {
        celestialBodies.push(new SpaceObject({
            x: 1200*Math.random(),
            y: 1000*Math.random(),
            mass: 0.5*Math.random(),
            speedX: 2-4*Math.random(),
            speedY: 2-4*Math.random(),
        }));
    }
}

addRandomBodies();

//store bodies that got absorbed to skip them in current frame and to not collide them again (just in opposite order)
let removed_bodies = [];
let already_collided = [];

const simulation = setInterval(()=>{
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //remove stuff that got collided in previous round
    for(let i = 0; i < removed_bodies.length; i++) {
        celestialBodies = celestialBodies.filter((_, index) => !removed_bodies.includes(index));
    }

    removed_bodies = [];
    already_collided = [];

    for(let i = 0; i < celestialBodies.length; i++) {
        if(removed_bodies.includes(i)) {
            continue;
        }
        calculatePosition(celestialBodies[i],i);
        drawBody(celestialBodies[i]);
    }
}, 1000/fps);

function drawBody(celestialBody) {
    ctx.beginPath();
    ctx.fillStyle = celestialBody.color;
    ctx.arc(celestialBody.x, celestialBody.y, celestialBody.radius, 0, 2*Math.PI);

    ctx.fill();
    ctx.stroke();

    //draw a tail
    if(tails) {
        for(let i = 0; i < celestialBody.tail.length; i++) {
            ctx.fillStyle = celestialBody.color;
            ctx.beginPath();
            ctx.rect(celestialBody.tail[i][0], celestialBody.tail[i][1], 1, 1); 
            ctx.fill();
        }
    }
}

//calculates and modifies position of each body, based on all other bodies (distances and masses)
function calculatePosition(celestialBody,index) {
    for(let i = 0; i < celestialBodies.length; i++) {
        if(celestialBody === celestialBodies[i] || removed_bodies[i]) { 
            //it's the same body - skip it, as it can't affect itself
            //it got absorbed - skip it as well, it's gravity will be obtained via the absorber
            continue;
        } 

        //check if they crash (sum of their radiuses is less than their distance?)
        //if so, launch .collide() and skip
        //otherwise continue normally
        
        if(!(already_collided.filter((arr)=>arr[0]==i && arr[1]==index).length)) {
            
            const collided = checkCollision(celestialBody, celestialBodies[i]);

            if(collided) {
                collide(celestialBody, celestialBodies[i]);                
                removed_bodies.push(i);
                already_collided.push([index,i]);
                continue;
            }
        

            //direction vector
            const directionV = [celestialBodies[i].x-celestialBody.x, celestialBodies[i].y-celestialBody.y];
            
            //distance
            const vLength = sizeScale*(directionV[0]**2 + directionV[1]**2)**.5;

            //acceleration
            const acc = (celestialBodies[i].mass / vLength**2) / speedScale;

            //normalized vector for proper X and Y speeds
            const directionV_normalized = [directionV[0]/vLength, directionV[1]/vLength];

            celestialBody.speedX += directionV_normalized[0]*acc;
            celestialBody.speedY += directionV_normalized[1]*acc;
        }
    }

    if(tails) 
    {    
        if(celestialBody.tail.length >= tail_size) {
            celestialBody.tail.shift();
        }
        celestialBody.tail.push([celestialBody.x, celestialBody.y]);
    }

    celestialBody.x += celestialBody.speedX * speedScale;
    celestialBody.y += celestialBody.speedY * speedScale;  
}

//check if two space bodies are touching each other 
function checkCollision(object_a, object_b) {
    const distance = ((object_a.x - object_b.x)**2 + (object_a.y - object_b.y)**2)**0.5;
    if(distance < object_a.radius + object_b.radius) {
        return true;
    }
    return false;
}

//collide two space bodies
function collide(object_a, object_b) {

    //mass ratios, to not calculate them twice
    const mass_ratio_a = object_a.mass/(object_a.mass+object_b.mass);
    const mass_ratio_b = object_b.mass/(object_a.mass+object_b.mass);

    const new_mass = object_a.mass + object_b.mass;
    object_a.color = chooseColor(new_mass);
    //keep tail of larger
    object_a.tail = object_a.mass > object_b.mass ? object_a.tail : object_b.tail;
    //set everything else based on value in each object and on what part of total mass it had, except .mass which is just a sum
    object_a.a = object_a.x * mass_ratio_a + object_b.x * mass_ratio_b;
    object_a.y = object_a.y * mass_ratio_a + object_b.y * mass_ratio_b;
    object_a.mass = new_mass;
    object_a.speedX = object_a.speedX * mass_ratio_a + object_b.speedX * mass_ratio_b;
    object_a.speedY = object_a.speedY * mass_ratio_a + object_b.speedY * mass_ratio_b;
    object_a.radius = 4*object_a.mass**0.5;
}

function chooseColor(mass) {
    let color = "gray";
    if(mass >= 100) {
        color = "mintcream";
    } 
    else if (mass >= 60) {
        color = "yellow";
    } else if (mass >= 30) {
        color = "orange";
    }
    else if(mass >= 15) {
        color = "red";
    } else if (mass >= 5) {
        color = "purple";
    }
    else if(mass >= 1) {
        color = "brown";
    }
    return color;
}
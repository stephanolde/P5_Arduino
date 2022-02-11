const modelURL = 'https://teachablemachine.withgoogle.com/models/UhleEzitN/';
// the json file (model topology) has a reference to the bin file (model weights)
const checkpointURL = modelURL + "model.json";
// the metatadata json file contains the text labels of your model and additional information
const metadataURL = modelURL + "metadata.json";

// Size of the camera on the screen in pixels
const size = 500;
const flip = true; // whether to flip the webcam

// Variables used for p5
let webcam;
let model;
let totalClasses;
let myCanvas;
let ctx;


// Variables for the serial control (ARDUINO)
let serial;
let counter = 0;
let green = false;

// A function that loads the model from the checkpoint
async function load() {
  model = await tmPose.load(checkpointURL, metadataURL);
  totalClasses = model.getTotalClasses();
  console.log("Number of classes, ", totalClasses);
}

// A function that loads the webcam
async function loadWebcam() {
  webcam = new tmPose.Webcam(size, size, flip); // can change width and height
  await webcam.setup(); // request access to the webcam
  await webcam.play();
  window.requestAnimationFrame(loopWebcam);
}

// The setup function
async function setup() {
  // Create the canvas and get it's 2d context.
  myCanvas = createCanvas(size, size);
  ctx = myCanvas.elt.getContext("2d");
  // Call the load function, wait until it finishes loading
  await load();
  await loadWebcam();

  // Start the serial server
  serial = new p5.SerialPort();

  // Connect to arduino on port "COM5"
  serial.open("COM5")

  // Function that runs when a connection to "COM5" is opened
  serial.on('open', function () {
    console.log("We have a connection!!");
  })

  // Function that runs when the Arduino sends data to p5.
  // This is done trough the Serial.print() and Serial.println() on arduino.
  serial.on('data', function () {
    let data = serial.readLine();
    console.log(data);
  })
}

// webcam loop function
async function loopWebcam(timestamp) {
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loopWebcam);
}

/**
 * This is the function that predicts what the pose is in the image.
 * You'll most likely change this function to suit your needs.
 */
async function predict() {
  // Prediction #1: run input through posenet
  // predict can take in an image, video or canvas html element
  const flipHorizontal = false;
  const { pose, posenetOutput } = await model.estimatePose(
    webcam.canvas,
    flipHorizontal
  );
  // Prediction 2: run input through teachable machine assification model
  const prediction = await model.predict(
    posenetOutput,
    flipHorizontal,
    totalClasses
  );

  // console.log('prediction: ', prediction);
  // Sort prediction array by probability
  // So the first classname will have the highest probability
  const sortedPrediction = prediction.sort((a, b) => - a.probability + b.probability);

  // Show the result
  const res = select('#res'); // select <span id="res">
  res.html(sortedPrediction[0].className);

  // Show the probability
  const prob = select('#prob'); // select <span id="prob">
  prob.html(sortedPrediction[0].probability.toFixed(2));

  // Get the first prediction. This is the prediction that has the best likelihood value.
  const p = sortedPrediction[0];

  // Get the html box. We will use this box to change the color.
  const box = select('#box');

  // We want to only mark it correct after one second of the correct pose.
  // sinds there are 60 frames per second we are using a counter that will count to 60.
  // if the pose was of class "correct" increase the counter
  if(p.className === "correct") {
    counter++;
  } else {
    // if the pose was something other than the "correct" reset the counter.
    counter = 0;
    // if the led was already green. (we already spend a second doing it correct.)
    // turn it back to red and send the message to arduino.
    if (green === true) {
      // Indicate that the led is no longer green.
      green = false;
      // Send the "incorrect" message to arduino. (don't forget to remove the "\n" on the arduino side using .trim() )
      serial.write("incorrect\n");
      // Sets the color of the box in the html page to red
      box.style("background-color", "red");
    }
  }

  // If the light is red, and the counter reached 60 then turn the light green.
  if (green === false && counter >= 60) {
    // Indicate that the led is now on.
    green = true
    // Send the "correct" message to arduino. (don't forget to remove the "\n" on the arduino side using .trim() )
    serial.write("correct\n");
    // Sets the color of the box in the html page to red
    box.style("background-color", "green");
  }

  // Overflow protection on counter.
  if (counter > 2000) {
    counter = 60;
  }

  // draw the keypoints and skeleton
  if (pose) {
    drawPose(pose);
  }
}

function drawPose(pose) {
  if (webcam.canvas) {
    // Saves the p5 drawing settings
    push()
    ctx.drawImage(webcam.canvas, 0, 0);
    // draw the keypoints and skeleton
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
    // Restores the saved p5 drawing settings
    pop()

    //// <Create an indication light on the camera>
    // Set the color of the light
    if (green) {
      fill("green");
    } else {
      fill("red");
    }
    // Draw a circle on the camera
    circle(20,20,20)

    //// <Create a moving box on the camera>
    // We will create a box that follows the nose.
    // to see al the possible points uncomment the next line
    // console.log(JSON.stringify(pose.keypoints));
    for (let point of pose.keypoints) {
      if (point.part === "nose") {
        // Saves the p5 drawing settings
        push()
        // Move the drawing cursor to the x and y of the nose.
        translate(point.position.x,point.position.y)
        // Make the object purple
        fill("purple")
        // Set the size of the square
        let squareSize = 100;
        // We want to draw a square on the wrist. to do this we need its center to be at the half of its width.
        // sinds our nose is now at 0 0 we need to move half the size back and up.
        // this means that we have: (size / 2) * -1
        square((squareSize/2) * -1, (squareSize/2) * -1,squareSize,squareSize)
        // Restore the p5 draw settings
        pop()
      }
    }

  }
}

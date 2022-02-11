#include <ChainableLED.h>

#define NUM_LEDS 1

ChainableLED leds(3,4, NUM_LEDS);

String pose = "asdasdasd";

void setup() {
  Serial.begin(9600);
  Serial.println("The arduino is online!");
  leds.setColorRGB(0, 255, 0, 0);
}

void loop() {
  // put your main code here, to run repeatedly:

  if (Serial.available()) {
    pose = Serial.readString();
    pose.trim();
    Serial.println(pose);

    if (pose == "correct") {
      leds.setColorRGB(0, 0, 255, 0);
    } else {
      leds.setColorRGB(0, 255, 0, 0);
    }
  }
}

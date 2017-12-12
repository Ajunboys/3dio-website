# Floor plan conversion API

The floor plan conversion API allows you to convert 2D floor plan images into interactive 3D models.
If your prefer to not set up your own server you can order models via: [https://spaces.archilogic.com/order](https://spaces.archilogic.com/order)

In both cases the `Explore` license allows for 3 free conversions per month the `Professional` license for 10. For further details take a look at the [pricing info](https://3d.io/#pricing).


## Conversion Request

`io3d.floorPlan.convertToBasic3dModel()` allows you to send a request to our conversion API from a custom node server.

The result is not instant but can take up to 12 hours.
This is why you need to provide a callback url from your node server to receive the callback when the conversion is finished.

[A secret API key is needed](get-started-node-server.md)

```js
io3d.floorPlan.convertToBasic3dModel({
   // floor plan url
   floorPlan: floorPlan,    
   // address ( optional ) - allows us to create a better light simulation
   address: address, 
   // callback url to reveive that callback when the conversion status changes
   callback: configs.url 
 }).then(conversionId => {
   console.log('Floor plan conversion has been accepted. Conversion ID is: ' + conversionId)
 }).catch(error => {
   console.error('Error in calling 3d.io API.', error)
 })
```

## Callback Notification

On conversion status update the 3dio server will send a message to the callback url:
```js
{
  "jsonrpc": "2.0",
  "method": "Floorplan.onConversionStatusUpdate",
  "params": {
    "conversionId": "910f5115-d1ef-4bbc-8f67-b062b4a54905"
  }
}
```

## Status Request

Once you receive the callback you can request a conversion status:
```
io3d.floorPlan
  .getConversionStatus({ conversionId: "910f5115-d1ef-4bbc-8f67-b062b4a54905" })
  .then(console.log)
```

In case of success you get the [sceneId](scene.md#scene-id) which you can send to your customer [as a url](scene.html#get-viewer-url) or use it to further process the scene.
```js
{
  "status": "COMPLETED",
  "sceneId": "44ec1f6f-e0d1-4837-9a2f-4c66424eee81",
  "conversionId": "910f5115-d1ef-4bbc-8f67-b062b4a54905"
}
```

In case of an error the status message will look like this:
```js
{
  "status": "REJECTED",
  "conversionId": "910f5115-d1ef-4bbc-8f67-b062b4a54905"
}
```

You can also request a conversion status before receiving a callback in which case the status message will look like:
```js
{
  "status": "IN_PROGRESS",
  "conversionId": "910f5115-d1ef-4bbc-8f67-b062b4a54905"
}
```


## Reference implementation

https://github.com/archilogic-com/3dio-floor-plan-app

This project showcases a reference implementation to let users order 3D models from floor plans through a custom UI and sending email notifications on conversion updates.

Setup used:
* node server running on [heroku](https://heroku.com)
* [3dio](https://3d.io) library to send order floor plan conversions and handle updates
* [firebase](https://firebase.google.com) to store user details and conversion ids
* [sendgrid](https://sendgrid.com/) to let users order 3D models from floor plans through a custom UI and sending notifications on conversion updates.


A deployed app is running here:<br>
https://io3d-floor-plan-app.herokuapp.com/

![](https://storage.3d.io/97fa0bf7-1405-4fe3-a2be-49d2101d4121/2017-10-02_21-31-15_okw9Ax/3d_io_Floor_Plan_App.png)

# Scene library

The scene library gives you access to your 3D scenes as well as the public 3D scenes from [Archilogic](https://spaces.archilogic.com/explore).

## List scenes

API key: **optional**

Lists all available scenes.
If a valid API key is supplied, it lists all scenes of your organisation, otherwise it lists all public scenes.

| Parameter | Required? | Description |
| --- | --- | --- |
| `page` | No | Specifies which page of results should be returned. Defaults to the first page (`page = 0`) |

### Example

The following snippet will return the first 40 public scenes:

```javascript
  var IO3D = require('3d.io')
  IO3D.scenes.list().then(console.log)
```
<!--
```bash
  curl -X POST -H 'content-type: application/json' -d '{ \
    "json-rpc": 2.0, \
    "id": "some-random-id", \
    "method": "Model.list", \
    "params": { \
      "filter": {} \
    } \
  }'
```
-->

## Get single scene

API key: **optional**

| Parameter | Required? | Description |
| --- | --- | --- |
| `resourceId` | No* | Specifies the global ID of the scene to be returned, which can be found in the `resourceId` field of a scene. |
| `resourceName` | No* | Has to be used in combination with `organizationResourceName`.<br>Specifies the name of the scene to be returned. |
| `organizationResourceName` | No* | Has to be used in combination with `resourceName`.<br>Name of the organisation who owns the scene.

***)** Either `resourceId` or both `resourceName` and `organizationResourceName` have to be specified.

### Example

Retrieves the public scene with the ID `abc123`

```javascript
  var IO3D = require('3d.io')
  IO3D.scenes.get({id: 'abc123' }).then(console.log)
```
<!--
```bash
  curl -X POST -H 'content-type: application/json' -d '{ \
    "json-rpc": 2.0, \
    "id": "some-random-id", \
    "method": "Model.read", \
    "params": { \
      "arguments": { \
        "resourceId": "abc123" \
      } \
    } \
  }'
```
-->

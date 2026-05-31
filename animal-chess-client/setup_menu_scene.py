import json
import uuid
import os

def gen_uuid():
    return str(uuid.uuid4())

def create_menu_scene():
    # Generate UUID for MainMenuUI script
    script_uuid = gen_uuid()
    script_meta = {
      "ver": "4.0.24",
      "importer": "typescript",
      "imported": True,
      "uuid": script_uuid,
      "files": [],
      "subMetas": {},
      "userData": {}
    }
    with open('assets/scripts/ui/MainMenuUI.ts.meta', 'w') as f:
        json.dump(script_meta, f, indent=2)

    # Generate IDs for Scene objects
    scene_asset_id = 1
    scene_id = 2
    canvas_id = 3
    canvas_comp_id = 4
    widget_comp_id = 5
    camera_id = 6
    camera_comp_id = 7
    menu_comp_id = 8
    scene_globals_id = 9

    scene_asset_uuid = gen_uuid()

    scene_json = [
      {
        "__type__": "cc.SceneAsset",
        "_name": "menu",
        "_objFlags": 0,
        "__editorExtras__": {},
        "_native": "",
        "scene": { "__id__": scene_id }
      },
      {
        "__type__": "cc.Scene",
        "_name": "menu",
        "_objFlags": 0,
        "__editorExtras__": {},
        "_parent": None,
        "_children": [ { "__id__": canvas_id } ],
        "_active": True,
        "_components": [],
        "_prefab": None,
        "_lpos": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
        "_lrot": { "__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1 },
        "_lscale": { "__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1 },
        "_mobility": 0,
        "_layer": 1073741824,
        "_euler": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
        "autoReleaseAssets": False,
        "_globals": { "__id__": scene_globals_id },
        "_id": gen_uuid()
      },
      {
        "__type__": "cc.Node",
        "_name": "Canvas",
        "_objFlags": 0,
        "__editorExtras__": {},
        "_parent": { "__id__": scene_id },
        "_children": [ { "__id__": camera_id } ],
        "_active": True,
        "_components": [
          { "__id__": canvas_comp_id },
          { "__id__": widget_comp_id },
          { "__id__": menu_comp_id }
        ],
        "_prefab": None,
        "_lpos": { "__type__": "cc.Vec3", "x": 360, "y": 640, "z": 0 },
        "_lrot": { "__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1 },
        "_lscale": { "__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1 },
        "_mobility": 0,
        "_layer": 33554432,
        "_euler": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
        "_id": gen_uuid()
      },
      {
        "__type__": "cc.Canvas",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": { "__id__": canvas_id },
        "_enabled": True,
        "__prefab": None,
        "_cameraComponent": { "__id__": camera_comp_id },
        "_alignCanvasWithScreen": True,
        "_id": gen_uuid()
      },
      {
        "__type__": "cc.Widget",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": { "__id__": canvas_id },
        "_enabled": True,
        "__prefab": None,
        "_alignFlags": 45,
        "_target": None,
        "_left": 0,
        "_right": 0,
        "_top": 0,
        "_bottom": 0,
        "_horizontalCenter": 0,
        "_verticalCenter": 0,
        "_isAbsLeft": True,
        "_isAbsRight": True,
        "_isAbsTop": True,
        "_isAbsBottom": True,
        "_isAbsHorizontalCenter": True,
        "_isAbsVerticalCenter": True,
        "_originalWidth": 0,
        "_originalHeight": 0,
        "_alignMode": 2,
        "_lockFlags": 0,
        "_id": gen_uuid()
      },
      {
        "__type__": "cc.Node",
        "_name": "Camera",
        "_objFlags": 0,
        "__editorExtras__": {},
        "_parent": { "__id__": canvas_id },
        "_children": [],
        "_active": True,
        "_components": [ { "__id__": camera_comp_id } ],
        "_prefab": None,
        "_lpos": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 1000 },
        "_lrot": { "__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1 },
        "_lscale": { "__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1 },
        "_mobility": 0,
        "_layer": 1073741824,
        "_euler": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
        "_id": gen_uuid()
      },
      {
        "__type__": "cc.Camera",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": { "__id__": camera_id },
        "_enabled": True,
        "__prefab": None,
        "_projection": 0,
        "_priority": 1073741824,
        "_fov": 45,
        "_fovAxis": 0,
        "_orthoHeight": 640,
        "_near": 1,
        "_far": 2000,
        "_color": { "__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255 },
        "_depth": 1,
        "_stencil": 0,
        "_clearFlags": 7,
        "_rect": { "__type__": "cc.Rect", "x": 0, "y": 0, "width": 1, "height": 1 },
        "_aperture": 19,
        "_shutter": 7,
        "_iso": 0,
        "_screenScale": 1,
        "_visibility": 4294967295,
        "_targetTexture": None,
        "_postProcess": None,
        "_usePostProcess": False,
        "_cameraType": -1,
        "_trackingType": 0,
        "_id": gen_uuid()
      },
      {
        "__type__": script_uuid,
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": { "__id__": canvas_id },
        "_enabled": True,
        "__prefab": None,
        "_id": gen_uuid()
      },
      {
        "__type__": "cc.SceneGlobals",
        "ambient": { "__id__": 10 },
        "shadows": { "__id__": 11 },
        "_skybox": { "__id__": 12 },
        "fog": { "__id__": 13 },
        "octree": { "__id__": 14 },
        "skin": { "__id__": 15 },
        "lightProbeInfo": { "__id__": 16 },
        "postSettings": { "__id__": 17 },
        "bakedWithStationaryMainLight": False,
        "bakedWithHighpLightmap": False
      },
      { "__type__": "cc.AmbientInfo" },
      { "__type__": "cc.ShadowsInfo" },
      { "__type__": "cc.SkyboxInfo" },
      { "__type__": "cc.FogInfo" },
      { "__type__": "cc.OctreeInfo" },
      { "__type__": "cc.SkinInfo" },
      { "__type__": "cc.LightProbeInfo" },
      { "__type__": "cc.PostSettingsInfo" }
    ]

    with open('assets/menu.scene', 'w') as f:
        json.dump(scene_json, f, indent=2)

    scene_meta = {
      "ver": "1.0.12",
      "importer": "scene",
      "imported": True,
      "uuid": scene_asset_uuid,
      "files": [],
      "subMetas": {},
      "userData": {}
    }
    with open('assets/menu.scene.meta', 'w') as f:
        json.dump(scene_meta, f, indent=2)

    print(f"Created menu.scene with UUID {scene_asset_uuid}")
    return scene_asset_uuid

def set_start_scene(scene_uuid):
    proj_json_path = 'settings/v2/packages/project.json'
    if os.path.exists(proj_json_path):
        with open(proj_json_path, 'r') as f:
            data = json.load(f)
    else:
        data = {}
    
    if "general" not in data:
        data["general"] = {}
    
    data["general"]["startScene"] = scene_uuid

    with open(proj_json_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated project startScene to {scene_uuid}")

if __name__ == '__main__':
    scene_uuid = create_menu_scene()
    set_start_scene(scene_uuid)

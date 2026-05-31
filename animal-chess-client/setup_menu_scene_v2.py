import json
import uuid
import os

def gen_uuid():
    return str(uuid.uuid4())

def create_menu_from_loading():
    with open('assets/loading.scene', 'r') as f:
        scene_data = json.load(f)
    
    # 1. Update the scene ID
    new_scene_id = gen_uuid()
    for item in scene_data:
        if item.get("__type__") == "cc.Scene":
            item["_id"] = new_scene_id
            item["_name"] = "menu"
        if item.get("__type__") == "cc.SceneAsset":
            item["_name"] = "menu"
            
        # 2. Update the attached script component
        if item.get("__type__") == "ae64de3d-b93e-44d5-b55f-e536363e796c":
            item["__type__"] = "fa75448d-428f-463c-98a9-fcdf84f5d5dc"
            # Remove LoadingScene specific properties
            keys_to_remove = ["progressBar", "progressText", "progressBadge", "bouncyHero", "heroBadge"]
            for k in keys_to_remove:
                if k in item:
                    del item[k]
            # Add new component ID
            item["_id"] = gen_uuid()

    with open('assets/menu.scene', 'w') as f:
        json.dump(scene_data, f, indent=2)

    # 3. Create meta file
    scene_asset_uuid = gen_uuid()
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
    scene_uuid = create_menu_from_loading()
    set_start_scene(scene_uuid)

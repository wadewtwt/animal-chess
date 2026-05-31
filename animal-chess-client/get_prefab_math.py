import json

def get_prefab_data():
    with open('assets/Piece.prefab') as f:
        data = json.load(f)
    for node in data:
        if node.get('__type__') == 'cc.UITransform':
            print("ContentSize:", node.get('_contentSize'), "Anchor:", node.get('_anchorPoint'))

get_prefab_data()

import requests
import json

response = requests.get('https://valorant-api.com/v1/maps')

if response.status_code == 200:
    data = response.json()
    maps = data['data']

    map_callout_data = {}

    for map in maps:
        if map['premierBackgroundImage'] is not None:
            map_data = {
                "xMultiplier": map['xMultiplier'],
                "yMultiplier": map['yMultiplier'],
                "xScalarToAdd": map['xScalarToAdd'],
                "yScalarToAdd": map['yScalarToAdd'],
                "callouts": [
                    {
                        "regionName": callout['regionName'],
                        "superRegionName": callout['superRegionName'],
                        "location": {
                            "x": callout['location']['x'],
                            "y": callout['location']['y'],
                        }
                    } for callout in map['callouts']
                ]
            }
            map_callout_data[map['displayName'].lower()] = map_data

    json_output = json.dumps(map_callout_data)

    print(json_output)
else:
    print(f'Error: {response.status_code} - {response.text}')

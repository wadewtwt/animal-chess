import urllib.request
import json
import urllib.parse

animals = ["mouse squeak", "cat meow", "dog bark", "wolf howl", "leopard roar", "tiger roar", "lion roar", "elephant trumpet"]
file_names = ["rat", "cat", "dog", "wolf", "leopard", "tiger", "lion", "elephant"]

for a, n in zip(animals, file_names):
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=allimages&aiprop=url&aiformat=ogg|mp3|wav&aisort=name&ailimit=5&aiprefix={urllib.parse.quote(a)}&format=json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        data = json.loads(response.read())
        print(f"Results for {a}:", [img['url'] for img in data['query']['allimages']])
    except Exception as e:
        print(f"Failed {a}: {e}")

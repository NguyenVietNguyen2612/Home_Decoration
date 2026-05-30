import json
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
furnitures_dir = root_dir / 'furnitures'
output_file = root_dir / 'menu-manifest.json'

categories = [
    {'id': 'decorations', 'label': 'Decorations', 'icon': '🪴'},
    {'id': 'things', 'label': 'Things', 'icon': '🛋️'},
    {'id': 'doors', 'label': 'Doors & Windows', 'icon': '🚪'},
]


def pretty_label(name: str) -> str:
    cleaned = name.replace('_', ' ').strip()
    return ' '.join(word.capitalize() for word in cleaned.split())


def scan_category(category_id: str):
    category_path = furnitures_dir / category_id
    if not category_path.is_dir():
        return []

    items = []
    for file_path in sorted(category_path.iterdir(), key=lambda p: p.name.lower()):
        if file_path.suffix.lower() == '.glb' and file_path.is_file():
            items.append({
                'type': f"{category_id}/{file_path.stem}",
                'label': pretty_label(file_path.stem),
            })
    return items


def scan_root_furniture():
    if not furnitures_dir.is_dir():
        return []

    items = []
    for file_path in sorted(furnitures_dir.iterdir(), key=lambda p: p.name.lower()):
        if file_path.suffix.lower() == '.glb' and file_path.is_file():
            items.append({
                'type': file_path.stem,
                'label': pretty_label(file_path.stem),
            })
    return items


def main():
    manifest = {
        'generatedAt': None,
        'categories': [],
    }

    root_items = scan_root_furniture()
    if root_items:
        manifest['categories'].append({
            'id': 'furnitures',
            'label': 'Furnitures',
            'icon': '🛋️',
            'items': root_items,
        })

    for category in categories:
        items = scan_category(category['id'])
        if items:
            manifest['categories'].append({
                'id': category['id'],
                'label': category['label'],
                'icon': category['icon'],
                'items': items,
            })

    from datetime import datetime

    manifest['generatedAt'] = datetime.utcnow().isoformat() + 'Z'
    output_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Generated {output_file} with {sum(len(cat["items"]) for cat in manifest["categories"])} items.')


if __name__ == '__main__':
    main()

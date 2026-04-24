#!/usr/bin/env python3
"""
Regenerate regional sidewalk GeoJSON files based on region_config.json
Edit region_config.json to adjust regional boundaries, then run this script.
"""
import json
from pathlib import Path

# Load configuration
with open('region_config.json', 'r') as f:
    config = json.load(f)

# Load complete sidewalk data
with open('philadelphia_sidewalks.geojson', 'r') as f:
    all_data = json.load(f)

# Create output directory
output_dir = Path('regional_data')
output_dir.mkdir(exist_ok=True)

# Function to check if point is in region
def in_region(lon, lat, lat_range, lon_range):
    lat_min, lat_max = lat_range
    lon_min, lon_max = lon_range
    return lon_min <= lon <= lon_max and lat_min <= lat <= lat_max

# Process each region
print("\n[*] Regenerating regional GeoJSON files...\n")
results = {}

for region_name, region_info in config['regions'].items():
    lat_range = region_info['lat_range']
    lon_range = region_info['lon_range']

    regional_features = []

    # Extract features that intersect with this region
    for feature in all_data['features']:
        coords = feature['geometry']['coordinates']
        # Include feature if any point is in this region
        if any(in_region(lon, lat, lat_range, lon_range) for lon, lat in coords):
            regional_features.append(feature)

    # Save regional GeoJSON
    regional_geojson = {
        'type': 'FeatureCollection',
        'features': regional_features
    }

    output_file = output_dir / f"{region_name.lower().replace(' ', '_')}_sidewalks.geojson"
    with open(output_file, 'w') as f:
        json.dump(regional_geojson, f)

    results[region_name] = {
        'segments': len(regional_features),
        'file': str(output_file),
        'bounds': f"Lat: {lat_range[0]}-{lat_range[1]}, Lon: {lon_range[0]}-{lon_range[1]}"
    }

    print(f"{region_name:25} | {len(regional_features):6,} segments | {output_file}")

# Save summary
print(f"\n[*] Summary:")
print("-" * 80)
print(f"{'Region':<25} | {'Segments':>10} | {'Output File':<45}")
print("-" * 80)
for region_name, result in results.items():
    print(f"{region_name:<25} | {result['segments']:>10,} | {result['file']}")

print(f"\n[*] Total segments across all regions: {sum(r['segments'] for r in results.values()):,}")
print(f"[*] Full dataset segments: {len(all_data['features']):,}")
print("\n[*] To adjust boundaries:")
print("    1. Edit region_config.json")
print("    2. Run this script again: python regenerate_regions.py")

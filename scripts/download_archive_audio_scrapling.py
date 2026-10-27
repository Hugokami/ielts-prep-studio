"""
Scrapling Official Audio Stream Downloader
Downloads Cambridge IELTS Listening mock audio files from Archive.org CDN.
If connecting from restricted network regions, pass --proxy or use an active proxy.
"""

import os
import sys
import argparse

AUDIO_URLS = [
    {
        "id": "cbt_listening_11",
        "filename": "listening_mock_11.mp3",
        "url": "https://ia601708.us.archive.org/10/items/mix-27m-28s-audio-joiner.com-copy-copy-copy-copy-copy-copy-copy/mix_27m28s%20%28audio-joiner.com%29%20-%20CopyCopyCopyCopyCopyCopyCopy.mp3"
    },
    {
        "id": "cbt_listening_12",
        "filename": "listening_mock_12.mp3",
        "url": "https://ia801009.us.archive.org/8/items/mix-26m-24s-audio-joiner.com-copy-copy-copy-copy-copy-copy-copy-copy-copy-copy-c/mix_26m24s%20%28audio-joiner.com%29%20-%20CopyCopyCopyCopyCopyCopyCopyCopyCopyCopyCopyCopyCopyCopyCopy.mp3"
    },
    {
        "id": "cbt_listening_13",
        "filename": "listening_mock_13.mp3",
        "url": "https://ia903203.us.archive.org/9/items/mix-25m-48s-audio-joiner.com-copy-copy-copy-copy-copy-copy-copy-copy-copy/mix_25m48s%20%28audio-joiner.com%29%20-%20CopyCopyCopyCopyCopyCopyCopyCopyCopy.mp3"
    }
]

def main():
    parser = argparse.ArgumentParser(description="Download IELTS Listening Audio Streams via Scrapling")
    parser.add_argument("--proxy", type=str, default=None, help="Proxy URL (e.g. http://127.0.0.1:7890)")
    parser.add_argument("--output-dir", type=str, default="audio", help="Output directory for audio files")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    try:
        from scrapling.fetchers import FetcherSession
    except ImportError:
        print("Scrapling not installed. Run: pip install 'scrapling[all]>=0.4.15'")
        sys.exit(1)

    print("Initializing Scrapling FetcherSession...")
    session_kwargs = {"impersonate": "chrome"}
    if args.proxy:
        session_kwargs["proxy"] = args.proxy
        print(f"Using proxy: {args.proxy}")

    with FetcherSession(**session_kwargs) as session:
        for item in AUDIO_URLS:
            out_path = os.path.join(args.output_dir, item["filename"])
            print(f"\n[Scrapling] Fetching {item['id']} ({item['filename']})...")
            print(f"URL: {item['url']}")
            try:
                resp = session.get(item["url"], stealthy_headers=True, timeout=120)
                if resp.status == 200 and len(resp.body) > 1000:
                    with open(out_path, "wb") as f:
                        f.write(resp.body)
                    print(f"SUCCESS: Saved {len(resp.body):,} bytes to {out_path}")
                else:
                    print(f"WARNING: Received status {resp.status}, body length: {len(resp.body)}")
            except Exception as e:
                print(f"ERROR downloading {item['id']}: {e}")
                print("Tip: If connection timed out, pass --proxy http://127.0.0.1:YOUR_PORT")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Convert MOV files to H.264 MP4 format for browser compatibility
"""

import os
import subprocess
import shutil

def convert_video_ffmpeg(input_path, output_path):
    """Convert video to H.264 MP4 format using ffmpeg"""
    try:
        print(f"Converting: {input_path}")
        print(f"Output: {output_path}")
        
        # Use ffmpeg command via subprocess
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Successfully converted: {output_path}")
            return True
        else:
            print(f"✗ FFmpeg error: {result.stderr}")
            return False
    except FileNotFoundError:
        print("✗ FFmpeg not found. Trying alternative method with moviepy...")
        return convert_video_moviepy(input_path, output_path)
    except Exception as e:
        print(f"✗ Error converting {input_path}: {e}")
        return False

def convert_video_moviepy(input_path, output_path):
    """Fallback: Convert video using moviepy"""
    try:
        from moviepy.editor import VideoFileClip
        
        print(f"  Using moviepy for conversion...")
        video = VideoFileClip(input_path)
        
        # Write with H.264 codec and AAC audio
        video.write_videofile(
            output_path,
            codec='libx264',
            audio_codec='aac',
            verbose=False,
            logger=None
        )
        
        video.close()
        print(f"✓ Successfully converted: {output_path}")
        return True
    except Exception as e:
        print(f"✗ MoviePy error: {e}")
        return False

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(base_dir, 'videos')
    
    # List of videos to convert
    conversions = [
        ('Canada_cricket_net.MOV', 'Canada_cricket_net.mp4'),
        ('Canada_cricket_net2.MOV', 'Canada_cricket_net2.mp4'),
    ]
    
    print("=" * 60)
    print("VIDEO CONVERSION TO H.264 MP4")
    print("=" * 60)
    
    success_count = 0
    for input_file, output_file in conversions:
        input_path = os.path.join(videos_dir, input_file)
        output_path = os.path.join(videos_dir, output_file)
        
        if os.path.exists(input_path):
            if convert_video_ffmpeg(input_path, output_path):
                success_count += 1
            print()
        else:
            print(f"✗ File not found: {input_path}\n")
    
    print("=" * 60)
    print(f"Conversion complete: {success_count}/{len(conversions)} successful")
    print("=" * 60)

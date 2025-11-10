# How to Paste Images into Properties

Mondo now supports pasting images directly from your clipboard into **any property field**. This is particularly useful when you take a screenshot and want to quickly add it as a cover image, avatar, thumbnail, or any other image property.

## Supported Properties

The paste functionality works with **all property fields**. You can paste images into any property, including but not limited to:
- `cover` - Main cover image for notes
- `thumbnail` - Thumbnail images
- `avatar` - User/entity avatar images
- `image` - Generic image properties
- `banner` - Banner images
- `icon` - Icon images
- Or any custom property name you define in your vault

## How to Use

1. **Copy an image to your clipboard**
   - Take a screenshot (Cmd+Shift+4 on Mac, Win+Shift+S on Windows)
   - Or copy an image from any application (Cmd+C / Ctrl+C)

2. **Click into any property field**
   - Open a note with properties (frontmatter)
   - Click on the value field of any property where you want to add an image

3. **Paste the image**
   - Press Cmd+V (Mac) or Ctrl+V (Windows)
   - The image will be automatically:
     - Saved as a file in your vault's attachment folder
     - Named with a descriptive prefix and timestamp (e.g., `cover-1699612345678.png`)
     - Linked in the property using a wikilink format (`[[filename]]`)

4. **See the result**
   - The image is immediately available in your vault
   - The property now references the image file
   - You can view or edit the image by clicking on it

## Supported Image Formats

The following image formats are supported:
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- GIF (`.gif`)
- WebP (`.webp`)
- BMP (`.bmp`)
- SVG (`.svg`)

## Examples

### Adding a Cover Image
1. Take a screenshot of an image you want as a cover
2. Open your note and click on the `cover` property field
3. Press Cmd+V to paste
4. The screenshot is now saved and linked as `[[cover-1699612345678.png]]`

### Adding an Avatar
1. Copy an avatar image from your browser
2. Open a person note and click on the `avatar` property field
3. Press Cmd+V to paste
4. The avatar is now saved and linked as `[[avatar-1699612345679.jpg]]`

## Technical Details

- Images are saved using Obsidian's `getAvailablePathForAttachment()` method, respecting your attachment folder settings
- Files are named with the property name and a timestamp to avoid conflicts
- The paste handler uses the browser's Clipboard API to access image data
- The feature integrates seamlessly with Obsidian's frontmatter system

## Troubleshooting

**The paste doesn't work:**
- Make sure you're clicking directly in a supported property field
- Verify your clipboard contains an image (not just a file path or URL)
- Check that the property name is one of the supported ones listed above

**Image quality issues:**
- The image is saved exactly as it appears in your clipboard
- For higher quality, consider manually importing and linking images
- Screenshots are typically saved in PNG format for best quality

**File organization:**
- Images are saved according to your Obsidian attachment settings
- You can move the files later using Obsidian's file manager
- Links will automatically update when you move files

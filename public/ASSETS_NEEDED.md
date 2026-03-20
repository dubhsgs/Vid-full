# Required Assets for Card Generator

Please add the following image files to the `/public` directory:

## bg.jpg
- **Purpose**: Background image for the card
- **Recommended Size**: 1920x1080px or higher
- **Format**: JPG
- **Description**: A dark, professional background image (can be abstract, gradient, or any visually appealing image)

## logo.png
- **Purpose**: Logo displayed at the top of the card
- **Recommended Size**: 300x60px (or similar aspect ratio)
- **Format**: PNG with transparency
- **Description**: Your brand logo or any logo you want to display on the card

## Temporary Workaround
Until you add these files, the card generator will:
- Use a solid dark color (#0d0d1a) as the background instead of bg.jpg
- Hide the logo section if logo.png is not available

## How to Add
1. Place `bg.jpg` in the `/public` folder
2. Place `logo.png` in the `/public` folder
3. Restart the dev server if needed

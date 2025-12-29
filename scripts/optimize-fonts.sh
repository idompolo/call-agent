#!/bin/bash

# Font Optimization Script for Korean-English Display
# This script converts TTF fonts to WOFF2 for better web performance

echo "🔤 Font Optimization Script"
echo "=========================="

# Check if public/fonts directory exists
if [ ! -d "public/fonts" ]; then
    echo "Creating public/fonts directory..."
    mkdir -p public/fonts
fi

# Function to convert TTF to WOFF2
convert_font() {
    local input_file=$1
    local output_file=$2
    
    if [ -f "$input_file" ]; then
        echo "Converting $(basename $input_file) to WOFF2..."
        
        # Check if woff2_compress is installed
        if command -v woff2_compress &> /dev/null; then
            woff2_compress "$input_file"
            mv "${input_file%.ttf}.woff2" "$output_file"
            echo "✅ Created: $output_file"
        else
            echo "⚠️  woff2_compress not found. Install with: brew install woff2"
            echo "   Or use online converter: https://cloudconvert.com/ttf-to-woff2"
        fi
    else
        echo "❌ File not found: $input_file"
    fi
}

# Convert Pretendard fonts
echo ""
echo "Converting Pretendard fonts..."
echo "------------------------------"

fonts=(
    "Pretendard-Thin"
    "Pretendard-ExtraLight"
    "Pretendard-Light"
    "Pretendard-Regular"
    "Pretendard-Medium"
    "Pretendard-SemiBold"
    "Pretendard-Bold"
    "Pretendard-ExtraBold"
    "Pretendard-Black"
)

for font in "${fonts[@]}"; do
    convert_font "public/fonts/${font}.ttf" "public/fonts/${font}.woff2"
done

# Download Pretendard Variable font if not exists
if [ ! -f "public/fonts/PretendardVariable.woff2" ]; then
    echo ""
    echo "Downloading Pretendard Variable font..."
    curl -L "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2" \
         -o "public/fonts/PretendardVariable.woff2"
    echo "✅ Downloaded: PretendardVariable.woff2"
fi

# Create subset fonts for faster loading (Korean + Basic Latin only)
echo ""
echo "Creating subset fonts (Korean + Basic Latin)..."
echo "------------------------------------------------"

# Subset creation requires pyftsubset
if command -v pyftsubset &> /dev/null; then
    # Create subset with Korean and basic Latin characters
    SUBSET_CHARS="U+0020-007F,U+00A0-00FF,U+0100-017F,U+1100-11FF,U+3000-303F,U+3130-318F,U+A960-A97F,U+AC00-D7AF,U+D7B0-D7FF"
    
    for font in "${fonts[@]}"; do
        if [ -f "public/fonts/${font}.ttf" ]; then
            echo "Creating subset for ${font}..."
            pyftsubset "public/fonts/${font}.ttf" \
                --unicodes="$SUBSET_CHARS" \
                --layout-features="kern,liga,calt" \
                --flavor="woff2" \
                --output-file="public/fonts/${font}-subset.woff2"
            echo "✅ Created: ${font}-subset.woff2"
        fi
    done
else
    echo "⚠️  pyftsubset not found. Install with: pip install fonttools[woff]"
fi

echo ""
echo "📊 Font Optimization Summary"
echo "============================"
echo "Original TTF size: $(du -sh public/fonts/*.ttf 2>/dev/null | awk '{sum+=$1} END {print sum "MB"}')"
echo "Optimized WOFF2 size: $(du -sh public/fonts/*.woff2 2>/dev/null | awk '{sum+=$1} END {print sum "MB"}')"
echo ""
echo "✨ Font optimization complete!"
echo ""
echo "Next steps:"
echo "1. Run: chmod +x scripts/optimize-fonts.sh"
echo "2. Run: ./scripts/optimize-fonts.sh"
echo "3. Restart your Next.js development server"
echo "4. Test font rendering in your browser"
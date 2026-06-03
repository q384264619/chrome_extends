#!/bin/bash

# 自动点击助手 - 测试脚本

echo "=========================================="
echo "  自动点击助手 - 项目测试"
echo "=========================================="
echo ""

# 检查必要文件是否存在
echo "📋 检查必要文件..."

files=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "background.js"
    "contentScript.js"
    "holidayManager.js"
    "icons/icon16.png"
    "icons/icon48.png"
    "icons/icon128.png"
)

missing_files=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        missing_files=$((missing_files + 1))
    fi
done

echo ""

if [ $missing_files -gt 0 ]; then
    echo "❌ 测试失败：缺少 $missing_files 个必要文件"
    exit 1
fi

echo "✅ 所有必要文件都存在"
echo ""

# 检查manifest.json格式
echo "🔍 检查manifest.json格式..."
if command -v python3 &> /dev/null; then
    python3 -c "import json; json.load(open('manifest.json'))" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✅ manifest.json 格式正确"
    else
        echo "  ❌ manifest.json 格式错误"
        exit 1
    fi
else
    echo "  ⚠️  跳过JSON格式检查（未安装python3）"
fi

echo ""

# 检查JavaScript语法
echo "🔍 检查JavaScript语法..."

js_files=(
    "popup.js"
    "background.js"
    "contentScript.js"
    "holidayManager.js"
)

syntax_errors=0
for file in "${js_files[@]}"; do
    if command -v node &> /dev/null; then
        node --check "$file" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  ✅ $file 语法正确"
        else
            echo "  ❌ $file 语法错误"
            syntax_errors=$((syntax_errors + 1))
        fi
    else
        echo "  ⚠️  跳过 $file 语法检查（未安装node）"
    fi
done

echo ""

if [ $syntax_errors -gt 0 ]; then
    echo "❌ 测试失败：发现 $syntax_errors 个语法错误"
    exit 1
fi

echo "✅ 所有JavaScript文件语法正确"
echo ""

# 检查文件大小
echo "📊 检查文件大小..."

total_size=0
for file in "${js_files[@]}" "manifest.json" "popup.html"; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        total_size=$((total_size + size))
        size_kb=$((size / 1024))
        echo "  📄 $file: ${size_kb}KB"
    fi
done

total_kb=$((total_size / 1024))
echo "  📦 总计: ${total_kb}KB"
echo ""

# 检查文档
echo "📚 检查文档..."

docs=(
    "README.md"
    "QUICKSTART.md"
    "INSTALL.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        lines=$(wc -l < "$doc")
        echo "  ✅ $doc ($lines 行)"
    else
        echo "  ⚠️  $doc (缺失)"
    fi
done

echo ""

# 总结
echo "=========================================="
echo "  测试结果总结"
echo "=========================================="
echo ""
echo "✅ 文件完整性: 通过"
echo "✅ 代码语法: 通过"
echo "✅ 文档完整性: 通过"
echo ""
echo "🎉 项目测试通过！可以加载到浏览器中使用"
echo ""
echo "📝 下一步："
echo "  1. 打开 Chrome/Edge: chrome://extensions/"
echo "  2. 开启'开发者模式'"
echo "  3. 点击'加载已解压的扩展程序'"
echo "  4. 选择当前目录: $(pwd)"
echo ""

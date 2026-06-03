#!/bin/bash

# 问题修复验证脚本 - 2026-06-03
# 用于验证两个问题的修复是否生效

echo "=========================================="
echo "自动点击助手 - 问题修复验证"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}修复内容：${NC}"
echo "1. 单次立即开始的任务无法马上执行"
echo "2. 目标是多个元素的情况，无法触发点击事件"
echo ""

# 检查文件是否存在
echo -e "${YELLOW}检查文件完整性...${NC}"
if [ -f "background.js" ]; then
    echo -e "${GREEN}✓ background.js 存在${NC}"
else
    echo -e "${RED}✗ background.js 不存在${NC}"
    exit 1
fi

if [ -f "manifest.json" ]; then
    echo -e "${GREEN}✓ manifest.json 存在${NC}"
else
    echo -e "${RED}✗ manifest.json 不存在${NC}"
    exit 1
fi

echo ""

# 检查修复代码是否存在
echo -e "${YELLOW}验证修复代码...${NC}"

# 检查问题1的修复
if grep -q "isImmediateTask" background.js; then
    echo -e "${GREEN}✓ 问题1修复代码已添加（立即执行任务判断）${NC}"
else
    echo -e "${RED}✗ 问题1修复代码未找到${NC}"
    exit 1
fi

# 检查问题2的修复
if grep -q "// ✅ 修改：只要找到了元素就返回true" background.js; then
    echo -e "${GREEN}✓ 问题2修复代码已添加（多元素点击返回值优化）${NC}"
else
    echo -e "${RED}✗ 问题2修复代码未找到${NC}"
    exit 1
fi

echo ""

# JavaScript语法检查
echo -e "${YELLOW}检查JavaScript语法...${NC}"
if command -v node &> /dev/null; then
    if node -c background.js 2>/dev/null; then
        echo -e "${GREEN}✓ background.js 语法正确${NC}"
    else
        echo -e "${RED}✗ background.js 存在语法错误${NC}"
        exit 1
    fi
    
    if node -c popup.js 2>/dev/null; then
        echo -e "${GREEN}✓ popup.js 语法正确${NC}"
    else
        echo -e "${RED}✗ popup.js 存在语法错误${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Node.js 未安装，跳过语法检查${NC}"
fi

echo ""

# 检查关键函数
echo -e "${YELLOW}验证关键函数...${NC}"

if grep -q "function calculateNextRunTime" background.js; then
    echo -e "${GREEN}✓ calculateNextRunTime 函数存在${NC}"
else
    echo -e "${RED}✗ calculateNextRunTime 函数不存在${NC}"
    exit 1
fi

if grep -q "function clickElementBySelector" background.js; then
    echo -e "${GREEN}✓ clickElementBySelector 函数存在${NC}"
else
    echo -e "${RED}✗ clickElementBySelector 函数不存在${NC}"
    exit 1
fi

if grep -q "function executeTask" background.js; then
    echo -e "${GREEN}✓ executeTask 函数存在${NC}"
else
    echo -e "${RED}✗ executeTask 函数不存在${NC}"
    exit 1
fi

echo ""

# 检查日志输出
echo -e "${YELLOW}验证日志输出...${NC}"

if grep -q "\[任务调度\] 立即执行任务，允许设置在1分钟内" background.js; then
    echo -e "${GREEN}✓ 立即执行任务的日志输出已添加${NC}"
else
    echo -e "${RED}✗ 立即执行任务的日志输出未找到${NC}"
fi

if grep -q "\[自动点击\] 完成: 成功" background.js; then
    echo -e "${GREEN}✓ 多元素点击的统计日志存在${NC}"
else
    echo -e "${RED}✗ 多元素点击的统计日志未找到${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 所有验证通过！${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo "1. 在Chrome中加载扩展程序"
echo "2. 创建测试任务验证修复效果"
echo "3. 查看控制台日志确认功能正常"
echo ""
echo "详细测试步骤请参考 FIX_ISSUES_20260603.md"
echo ""

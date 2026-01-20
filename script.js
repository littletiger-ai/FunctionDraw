let chart = null;
let functionCount = 0;
const defaultColors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e'];

document.addEventListener('DOMContentLoaded', () => {
    // 初始化第一个函数输入框
    addFunctionRow('sin(x)', defaultColors[0]);

    // 绑定添加按钮事件
    document.getElementById('add-func-btn').addEventListener('click', () => {
        const color = defaultColors[functionCount % defaultColors.length];
        addFunctionRow('', color);
    });

    // 绑定绘制按钮点击事件
    document.getElementById('draw-btn').addEventListener('click', drawFunction);
    
    // 初始绘制
    drawFunction();
});

function addFunctionRow(initialValue = '', initialColor = '#3498db') {
    functionCount++;
    const container = document.getElementById('functions-list');
    const row = document.createElement('div');
    row.className = 'function-row';
    row.dataset.id = functionCount;

    const label = document.createElement('label');
    label.textContent = `f${functionCount}: `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'func-input';
    input.placeholder = '例如: sin(x) 或 x^2 + y^2 = 9';
    input.value = initialValue;
    // 绑定回车键事件
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            drawFunction();
        }
    });

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'func-color';
    colorPicker.value = initialColor;
    // 颜色改变时重绘
    colorPicker.addEventListener('change', drawFunction);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.title = '删除此函数';
    removeBtn.textContent = '×'; // 使用乘号作为删除图标
    removeBtn.addEventListener('click', () => {
        // 如果只剩下一个输入框，清空而不是删除
        if (container.children.length <= 1) {
            input.value = '';
            drawFunction();
            return;
        }
        container.removeChild(row);
        drawFunction();
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(colorPicker);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

function drawFunction() {
    const xMin = parseFloat(document.getElementById('x-min').value);
    const xMax = parseFloat(document.getElementById('x-max').value);
    const yMin = parseFloat(document.getElementById('y-min').value);
    const yMax = parseFloat(document.getElementById('y-max').value);

    // 验证坐标范围
    if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) {
        alert('无效的 X 轴范围');
        return;
    }
    if (isNaN(yMin) || isNaN(yMax) || yMin >= yMax) {
        alert('无效的 Y 轴范围');
        return;
    }

    const data = [];
    const rows = document.querySelectorAll('.function-row');
    
    let hasError = false;

    rows.forEach(row => {
        const rawFuncStr = row.querySelector('.func-input').value.trim();
        const color = row.querySelector('.func-color').value;

        if (!rawFuncStr) return; // 跳过空输入

        try {
            // 预处理函数字符串
            let processedStr = preprocessFunction(rawFuncStr);
            let fnType = 'linear'; // 默认为显函数
            
            // 检查是否包含等号，如果是，则视为隐函数
            if (processedStr.includes('=')) {
                fnType = 'implicit';
                // 将 left = right 转换为 left - (right) = 0
                const parts = processedStr.split('=');
                if (parts.length === 2) {
                    processedStr = `${parts[0]} - (${parts[1]})`;
                }
            }

            // 构建 data 对象
            const dataObj = {
                fn: processedStr,
                fnType: fnType,
                color: color
            };

            // 仅在显函数时使用 polyline，隐函数使用默认的 interval
            if (fnType !== 'implicit') {
                dataObj.graphType = 'polyline';
            }

            data.push(dataObj);

        } catch (err) {
            console.error(err);
            // 这里不弹窗报错，以免打断循环，只在控制台输出
            // 或者可以给输入框加红色边框提示
            hasError = true;
        }
    });

    if (data.length === 0 && !hasError) {
        // 如果没有有效数据且没有错误（即都是空的），可以清空图表或显示默认网格
        // function-plot 需要至少一个 data 对象或者正确配置，这里我们传入空数组试试，或者什么都不做
    }

    try {
        const width = document.getElementById('functionChart').clientWidth || 800;
        const height = 500; 

        functionPlot({
            target: '#functionChart',
            width: width,
            height: height,
            yAxis: { domain: [yMin, yMax] },
            xAxis: { domain: [xMin, xMax] },
            grid: true,
            data: data,
            tip: {
                xLine: true,
                yLine: true,
                renderer: function (x, y, index) {
                    return `(${x.toFixed(3)}, ${y.toFixed(3)})`;
                }
            }
        });
    } catch (err) {
        console.error('绘图错误:', err);
        if (hasError) {
             alert('部分函数解析错误，请检查输入公式');
        }
    }
}

function preprocessFunction(funcStr) {
    // 统一转换为小写
    funcStr = funcStr.toLowerCase();

    // 1. 全角转半角
    funcStr = funcStr.replace(/（/g, '(').replace(/）/g, ')');
    
    // 2. 替换 ln 为 log
    funcStr = funcStr.replace(/\bln\b/g, 'log');

    // 3. 处理 sin2x, cos2x 等简写 (函数名后直接跟数字或变量)
    const funcs = ['sin', 'cos', 'tan', 'log', 'sqrt', 'abs', 'exp', 'asin', 'acos', 'atan'];
    funcs.forEach(fn => {
        // 匹配函数名后面紧跟数字、小数点或x的情况
        // 例如: sin2x -> sin(2x), sinx -> sin(x), sin2.5 -> sin(2.5)
        // 排除已经是括号开头的情况
        const regex = new RegExp(`\\b${fn}\\s*([0-9x.]+(?:x)?)`, 'g');
        funcStr = funcStr.replace(regex, `${fn}($1)`);
    });

    return funcStr;
}

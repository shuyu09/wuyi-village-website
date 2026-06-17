// 全局配置
const PAGE_SIZE = 8; // 每页展示5条留言，可自行修改
let currentPage = 1;  // 当前页码
let messageData = JSON.parse(localStorage.getItem('forumMsg')) || [];
// 记录当前浏览器点赞记录（每条留言仅能点赞一次）
let likeRecord = JSON.parse(localStorage.getItem('likeRecord')) || [];
// 临时存储上传图片base64
let tempImg = "";

// 页面加载完成初始化
window.onload = function () {
    renderMessage();
}

// ===================== 表情插入功能 =====================
function insertEmoji(emoji) {
    const contentDom = document.getElementById('content');
    // 在光标位置插入表情
    const start = contentDom.selectionStart;
    const end = contentDom.selectionEnd;
    const text = contentDom.value;
    contentDom.value = text.substring(0, start) + emoji + text.substring(end);
    // 恢复光标位置
    contentDom.selectionStart = contentDom.selectionEnd = start + emoji.length;
    contentDom.focus();
}

// ===================== 图片上传+预览 =====================
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    // 限制图片大小 2MB
    if (file.size > 2 * 1024 * 1024) {
        alert("图片大小不能超过2MB！");
        document.getElementById('imgUpload').value = "";
        tempImg = "";
        document.getElementById('imgPreview').classList.add('d-none');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        tempImg = e.target.result;
        const previewBox = document.getElementById('imgPreview');
        const previewImg = document.getElementById('previewImg');
        previewImg.src = tempImg;
        previewBox.classList.remove('d-none');
    }
    reader.readAsDataURL(file);
}

// ===================== 发布新留言 =====================
function publishMsg() {
    let nickname = document.getElementById('nickname').value.trim();
    let content = document.getElementById('content').value.trim();

    if (!nickname) {
        alert('请输入昵称！');
        return;
    }
    if (!content && !tempImg) {
        alert('请输入留言内容或上传图片！');
        return;
    }

    // 组装留言数据
    let newMsg = {
        id: Date.now(),
        nickname: nickname,
        content: content,
        img: tempImg,
        time: new Date().toLocaleString(),
        like: 0,
        replyList: []
    };

    messageData.unshift(newMsg);
    localStorage.setItem('forumMsg', JSON.stringify(messageData));

    // 清空表单
    document.getElementById('nickname').value = '';
    document.getElementById('content').value = '';
    document.getElementById('imgUpload').value = "";
    document.getElementById('imgPreview').classList.add('d-none');
    tempImg = "";

    renderMessage();
}

// ===================== 渲染留言+分页 =====================
function renderMessage() {
    const total = messageData.length;
    const totalPage = Math.ceil(total / PAGE_SIZE);
    // 页码边界判断
    if (currentPage > totalPage && totalPage > 0) currentPage = totalPage;
    if (currentPage < 1) currentPage = 1;

    // 截取当前页数据
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = messageData.slice(start, end);

    const listDom = document.getElementById('msgList');
    let html = '';

    if (total === 0) {
        listDom.innerHTML = '<div class="alert alert-info text-center">暂无留言，快来发布第一条吧！</div>';
        document.getElementById('pageBox').innerHTML = "";
        return;
    }

    // 遍历当前页留言
    pageData.forEach((item) => {
        // 渲染回复
        let replyHtml = '';
        if (item.replyList.length > 0) {
            replyHtml += '<div class="mt-3 ps-4 border-start border-secondary">';
            item.replyList.forEach(reply => {
                replyHtml += `
                    <div class="bg-white p-2 rounded mb-2">
                        <span class="text-success fw-bold">${reply.nickname}</span>
                        <span class="text-muted small">${reply.time}</span>
                        <p class="mb-1">${reply.content}</p>
                        ${reply.replyImg ? `<img src="${reply.replyImg}" style="max-width:150px;border-radius:4px;">` : ''}
                    </div>
                `;
            });
            replyHtml += '</div>';
        }

        // 判断当前用户是否已点赞
        const hasLiked = likeRecord.includes(item.id);
        const likeBtnText = hasLiked ? "❤️ 已点赞" : "❤️ 点赞";
        const likeBtnClass = hasLiked ? "btn btn-outline-secondary btn-sm" : "btn btn-outline-danger btn-sm";

        // 主留言HTML
        html += `
        <div class="card shadow mb-4">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="text-success mb-1">${item.nickname}</h5>
                    <span class="text-muted small">${item.time}</span>
                </div>
                <p class="my-2">${item.content}</p>
                ${item.img ? `<img src="${item.img}" style="max-width:250px;border-radius:4px;margin:8px 0;">` : ''}

                <div class="d-flex gap-3 mt-3">
                    <button class="${likeBtnClass}" onclick="addLike(${item.id})" ${hasLiked ? 'disabled' : ''}>
                        ${likeBtnText} <span id="like_${item.id}">${item.like}</span>
                    </button>
                    <button class="btn btn-outline-primary btn-sm" onclick="showReplyBox(${item.id})">💬 回复</button>
                </div>

                <!-- 回复输入框 -->
                <div id="replyBox_${item.id}" class="mt-3 d-none">
                    <div class="row g-2">
                        <div class="col-md-3">
                            <input type="text" class="form-control form-control-sm" id="replyName_${item.id}" placeholder="你的昵称">
                        </div>
                        <div class="col-md-5">
                            <input type="text" class="form-control form-control-sm" id="replyContent_${item.id}" placeholder="写下回复内容">
                        </div>
                        <div class="col-md-2">
                            <input type="file" class="form-control form-control-sm" id="replyImg_${item.id}" accept="image/*" onchange="previewReplyImg(event,${item.id})">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-primary btn-sm w-100" onclick="submitReply(${item.id})">提交</button>
                        </div>
                    </div>
                    <div id="replyImgPre_${item.id}" class="mt-2 d-none">
                        <img id="replyPre_${item.id}" style="max-width:120px;">
                    </div>
                </div>
                ${replyHtml}
            </div>
        </div>
        `;
    });

    listDom.innerHTML = html;

    // 渲染分页按钮
    let pageHtml = `
        <button class="btn btn-sm btn-success me-2" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        <span class="mx-2">第 ${currentPage} / ${totalPage} 页</span>
        <button class="btn btn-sm btn-success ms-2" onclick="changePage(${currentPage + 1})" ${currentPage === totalPage ? 'disabled' : ''}>下一页</button>
    `;
    document.getElementById('pageBox').innerHTML = pageHtml;
}

// ===================== 分页切换 =====================
function changePage(page) {
    currentPage = page;
    renderMessage();
}

// ===================== 点赞功能（限制每人1次） =====================
function addLike(msgId) {
    // 二次判断防重复点赞
    if (likeRecord.includes(msgId)) return;

    messageData.forEach(item => {
        if (item.id === msgId) {
            item.like += 1;
        }
    });
    // 记录点赞ID
    likeRecord.push(msgId);

    localStorage.setItem('forumMsg', JSON.stringify(messageData));
    localStorage.setItem('likeRecord', JSON.stringify(likeRecord));
    renderMessage();
}

// ===================== 展开/收起回复框 =====================
function showReplyBox(msgId) {
    const box = document.getElementById(`replyBox_${msgId}`);
    box.classList.toggle('d-none');
}

// 回复图片预览临时存储
let replyImgTemp = {};

// ===================== 回复图片预览 =====================
function previewReplyImg(event, msgId) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        alert("图片大小不能超过2MB！");
        event.target.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        replyImgTemp[msgId] = e.target.result;
        const preBox = document.getElementById(`replyImgPre_${msgId}`);
        const preImg = document.getElementById(`replyPre_${msgId}`);
        preImg.src = e.target.result;
        preBox.classList.remove('d-none');
    }
    reader.readAsDataURL(file);
}

// ===================== 提交回复（支持文字+图片） =====================
function submitReply(msgId) {
    let replyName = document.getElementById(`replyName_${msgId}`).value.trim();
    let replyContent = document.getElementById(`replyContent_${msgId}`).value.trim();
    let replyImg = replyImgTemp[msgId] || "";

    if (!replyName) {
        alert('请填写昵称！');
        return;
    }
    if (!replyContent && !replyImg) {
        alert('请填写回复内容或上传图片！');
        return;
    }

    const replyData = {
        nickname: replyName,
        content: replyContent,
        replyImg: replyImg,
        time: new Date().toLocaleString()
    };

    messageData.forEach(item => {
        if (item.id === msgId) {
            item.replyList.push(replyData);
        }
    });

    localStorage.setItem('forumMsg', JSON.stringify(messageData));
    // 清空回复区域
    document.getElementById(`replyName_${msgId}`).value = "";
    document.getElementById(`replyContent_${msgId}`).value = "";
    document.getElementById(`replyImg_${msgId}`).value = "";
    replyImgTemp[msgId] = "";
    document.getElementById(`replyImgPre_${msgId}`).classList.add('d-none');

    renderMessage();
}

// 页面滚动监听
window.addEventListener('scroll', function () {
    let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
})

console.log("五一村留言论坛加载完成，支持表情、图片、点赞、分页！");
// ===================== 采摘预约 公共函数 =====================
// 读取本地全部预约数据
function getReserveData(){
    return JSON.parse(localStorage.getItem('reserveList')) || [];
}

// 1. 游客：提交采摘预约
function submitReserve(){
    let name = document.getElementById('resName').value.trim();
    let phone = document.getElementById('resPhone').value.trim();
    let date = document.getElementById('resDate').value.trim();
    let num = document.getElementById('resNum').value.trim();
    let remark = document.getElementById('resRemark').value.trim();

    // 表单校验
    if(!name){alert('请填写预约人姓名！');return;}
    if(!phone){alert('请填写联系电话！');return;}
    if(!date){alert('请选择采摘日期！');return;}
    if(!num || Number(num) < 1){alert('请填写有效同行人数！');return;}

    // 组装预约数据
    let newRes = {
        rid: Date.now(),
        userName: name,
        userPhone: phone,
        pickDate: date,
        peopleNum: num,
        note: remark,
        submitTime: new Date().toLocaleString()
    };

    // 存入本地存储
    let reserveArr = getReserveData();
    reserveArr.unshift(newRes);
    localStorage.setItem('reserveList', JSON.stringify(reserveArr));

    // 清空表单
    document.getElementById('resName').value = '';
    document.getElementById('resPhone').value = '';
    document.getElementById('resDate').value = '';
    document.getElementById('resNum').value = '';
    document.getElementById('resRemark').value = '';

    alert('采摘预约提交成功！请前往下方输入姓名查询你的记录');
}

// 2. 游客：输入姓名 查询本人预约
function queryMyReserve(){
    let inputName = document.getElementById('queryName').value.trim();
    let resultBox = document.getElementById('myResResult');
    let reserveArr = getReserveData();

    if(!inputName){
        resultBox.innerHTML = '<div class="alert alert-warning">请输入你的姓名！</div>';
        return;
    }

    // 筛选对应姓名的预约
    let myList = reserveArr.filter(item => item.userName === inputName);
    if(myList.length === 0){
        resultBox.innerHTML = '<div class="alert alert-info">未查询到该姓名的预约记录，请核对姓名</div>';
        return;
    }

    // 渲染个人预约列表
    let html = '';
    myList.forEach(item => {
        html += `
        <div class="border p-3 mb-3 rounded">
            <p><strong>预约编号：</strong>${item.rid}</p>
            <p><strong>预约姓名：</strong>${item.userName}</p>
            <p><strong>联系电话：</strong>${item.userPhone}</p>
            <p><strong>采摘日期：</strong>${item.pickDate}</p>
            <p><strong>同行人数：</strong>${item.peopleNum} 人</p>
            <p><strong>备注：</strong>${item.note || '无'}</p>
            <p class="text-muted">提交时间：${item.submitTime}</p>
        </div>
        `;
    });
    resultBox.innerHTML = html;
}

// 3. 管理员：口令校验 + 查询全部预约
function checkAdminPwd(){
    // 固定管理员口令
    const correctPwd = "查询所有预约记录";
    let inputPwd = document.getElementById('adminPwd').value.trim();
    let allResultBox = document.getElementById('allResResult');
    let reserveArr = getReserveData();

    // 口令校验
    if(inputPwd !== correctPwd){
        allResultBox.innerHTML = '<div class="alert alert-danger">口令错误，无权查看全部记录！</div>';
        return;
    }

    // 口令正确，渲染全部预约
    if(reserveArr.length === 0){
        allResultBox.innerHTML = '<div class="alert alert-info">目前暂无任何采摘预约记录</div>';
        return;
    }

    let html = '';
    reserveArr.forEach(item => {
        html += `
        <div class="border p-3 mb-3 rounded">
            <p><strong>预约编号：</strong>${item.rid}</p>
            <p><strong>预约姓名：</strong>${item.userName}</p>
            <p><strong>联系电话：</strong>${item.userPhone}</p>
            <p><strong>采摘日期：</strong>${item.pickDate}</p>
            <p><strong>同行人数：</strong>${item.peopleNum} 人</p>
            <p><strong>备注：</strong>${item.note || '无'}</p>
            <p class="text-muted">提交时间：${item.submitTime}</p>
        </div>
        `;
    });
    allResultBox.innerHTML = html;
}

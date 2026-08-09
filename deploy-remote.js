const path = require('path');
const fs = require('fs');
const OSS = require('ali-oss');
require('dotenv').config();

// 校验环境变量
const { OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET } = process.env;

if (!OSS_REGION || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
    console.error('❌ 错误: .env 配置文件缺少完整的 OSS 配置信息。');
    process.exit(1);
}

const client = new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    secure: true,
});

// 本地 remote 源码路径
const LOCAL_REMOTE_DIR = path.join(__dirname, 'animal-chess-client', 'build', 'wechatgame', 'remote');

/**
 * 递归获取目录下所有文件列表
 */
function getFilesRecursively(dirPath, fileList = []) {
    if (!fs.existsSync(dirPath)) return fileList;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getFilesRecursively(fullPath, fileList);
        } else {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

/**
 * 1. 删除 OSS 根目录上的 remote/ 文件夹内容
 */
async function deleteRemoteFolder() {
    console.log('🗑️  [1/2] 正在检索并删除 OSS 上的 remote/ 文件夹内容...');
    let continuationToken = null;
    let totalDeleted = 0;

    do {
        const query = {
            prefix: 'remote/',
            'max-keys': 1000,
        };
        if (continuationToken) {
            query['continuation-token'] = continuationToken;
        }

        const result = await client.listV2(query);
        continuationToken = result.nextContinuationToken;

        if (result.objects && result.objects.length > 0) {
            const keys = result.objects.map((o) => o.name);
            await client.deleteMulti(keys);
            totalDeleted += keys.length;
            console.log(`   - 已删除 ${keys.length} 个远程文件 (累计: ${totalDeleted})`);
        }
    } while (continuationToken);

    console.log(`✅ 远程 remote/ 目录清空完毕，共删除 ${totalDeleted} 个对象。\n`);
}

/**
 * 2. 上传本地 remote 文件夹到 OSS 根目录
 */
async function uploadRemoteFolder() {
    console.log(`📦 [2/2] 正在检查本地 remote 目录: ${LOCAL_REMOTE_DIR}`);

    if (!fs.existsSync(LOCAL_REMOTE_DIR)) {
        console.error(`❌ 错误: 本地构建目录不存在！请先在 Cocos Creator 中构建微信小游戏项目。`);
        console.error(`目标路径: ${LOCAL_REMOTE_DIR}`);
        process.exit(1);
    }

    const filePaths = getFilesRecursively(LOCAL_REMOTE_DIR);
    console.log(`   - 共找到 ${filePaths.length} 个待上传文件。`);

    if (filePaths.length === 0) {
        console.warn('⚠️ 警告: 本地 remote 文件夹下没有任何文件！');
        return;
    }

    console.log('🚀 开始上传文件到 OSS...');
    let count = 0;

    // 简单控制并发为 5
    const CONCURRENCY = 5;
    for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
        const chunk = filePaths.slice(i, i + CONCURRENCY);
        await Promise.all(
            chunk.map(async (filePath) => {
                // 计算相对路径并转成标准 POSIX 路径 (使用正斜杠 '/')
                const relativePath = path.relative(LOCAL_REMOTE_DIR, filePath).replace(/\\/g, '/');
                const ossKey = `remote/${relativePath}`;

                await client.put(ossKey, filePath);
                count++;
                console.log(`   [${count}/${filePaths.length}] 上传完成: ${ossKey}`);
            })
        );
    }

    console.log(`\n🎉 上传成功！共上传 ${count} 个文件至 bucket: ${OSS_BUCKET} 的 remote/ 目录。`);
}

/**
 * 3. 上传成功后删除本地 remote 文件夹
 */
function deleteLocalRemoteFolder() {
    console.log(`\n🧹 [3/3] 正在删除本地 remote 文件夹: ${LOCAL_REMOTE_DIR}`);
    if (fs.existsSync(LOCAL_REMOTE_DIR)) {
        fs.rmSync(LOCAL_REMOTE_DIR, { recursive: true, force: true });
        console.log('✅ 本地 remote 文件夹已成功从磁盘清理删除。');
    } else {
        console.log('ℹ️ 本地 remote 文件夹不存在，无需删除。');
    }
}

// 主入口
async function main() {
    console.log('====================================');
    console.log('🚀 开始执行 OSS Remote 资源部署任务');
    console.log(`🎯 Bucket: ${OSS_BUCKET} (${OSS_REGION})`);
    console.log('====================================\n');

    try {
        await deleteRemoteFolder();
        await uploadRemoteFolder();
        deleteLocalRemoteFolder();
        console.log('\n✨ 部署任务全部顺利完成！');
    } catch (err) {
        console.error('\n❌ 部署失败:', err);
        process.exit(1);
    }
}

main();

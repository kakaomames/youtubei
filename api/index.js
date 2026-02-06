import { Innertube, UniversalCache } from 'youtubei.js';

export default async function handler(req, res) {
    const { videoId, res: resMode, type } = req.query;
    console.log(`videoId: ${videoId}, type: ${type}`); // パラメータをプリント！

    if (!videoId) {
        res.status(400).json({ error: "videoIdが足りないよ！" });
        return;
    }

    try {
        const yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true
        });

        // 1. クライアントの優先順位を決定
        const typeMap = {
            'A': 'ANDROID',
            'I': 'IOS',
            'W': 'WEB',
            'T': 'TV'
        };

        let clients = ['ANDROID', 'IOS', 'TV', 'WEB']; // デフォルトの順番
        
        // もし type が指定されていたら、その機種を先頭に持ってくる
        if (type && typeMap[type.toUpperCase()]) {
            const selected = typeMap[type.toUpperCase()];
            clients = [selected, ...clients.filter(c => c !== selected)];
            console.log(`ACTION: 指定された ${selected} を最優先でトライします！`);
        }

        let info = null;
        let lastError = null;

        // 2. 順番に試行
        for (const client of clients) {
            try {
                const tempInfo = await yt.getInfo(videoId, client);
                // ストリーミングデータがある、または res=j モードなら成功とみなす
                if (tempInfo.streaming_data || resMode === 'j') {
                    info = tempInfo;
                    console.log(`SUCCESS: ${client} でデータ確保！`);
                    break;
                }
            } catch (err) {
                lastError = err.message;
                console.log(`WARNING: ${client} 失敗 (${err.message})`);
            }
        }

        if (!info) {
            throw new Error(lastError || "全デバイスで全滅しました");
        }

        // 3. レスポンス処理
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (resMode === 'j') {
            return res.status(200).json(info);
        }

        const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
        res.status(200).json({
            success: true,
            client: info.client_name,
            title: info.basic_info.title,
            url: format ? format.url : null,
            error: format ? null : "Streaming data found but no combined format available"
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

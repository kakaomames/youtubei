import { Innertube, UniversalCache } from 'youtubei.js';

export default async function handler(req, res) {
    const { videoId } = req.query;
    console.log(`Target VideoID: ${videoId}`);

    if (!videoId) {
        res.status(400).json({ error: "videoIdが必要だよ！" });
        return;
    }

    try {
        const yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true
        });

        console.log("SYSTEM: YouTubeからストリームを吸い出し中...");

        // 1. 動画のストリームを取得（これがプロキシの核心！）
        // youtubei.jsが内部で initplayback などを処理してくれます
        const stream = await yt.download(videoId, {
            type: 'video+audio',
            quality: 'best',
            format: 'mp4'
        });

        // 2. レスポンスヘッダーの設定
        // ブラウザに「これは動画ファイル（mp4）だよ」と教える
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Access-Control-Allow-Origin', '*');
        // 動画をダウンロードさせずにストリーミング再生させる設定
        res.setHeader('Content-Disposition', 'inline');

        // 3. データの「横流し」実行
        // ReadableStreamをそのままレスポンスにパイプ(転送)します
        const reader = stream.getReader();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // チャンク（データの破片）が届くたびに隊員へ送信
            res.write(value);
        }

        console.log("SUCCESS: 全データの転送完了！");
        res.end();

    } catch (e) {
        console.error("ERROR:", e.message);
        // エラー時はJSONで返す
        if (!res.headersSent) {
            res.status(500).json({ error: e.message });
        }
    }
}

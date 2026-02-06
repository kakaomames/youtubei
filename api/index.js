import { Innertube, UniversalCache } from 'youtubei.js';

export default async function handler(req, res) {
    const { videoId } = req.query;
    console.log(`videoId: ${videoId}`);

    if (!videoId) {
        res.status(400).json({ error: "videoIdパラメータが足りないよ！" });
        return;
    }

    try {
        const yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true
        });

        let info = null;
        // 試行するデバイスの優先順位リスト
        const clients = ['ANDROID', 'TV', 'IOS', 'WEB'];
        
        for (const client of clients) {
            console.log(`SYSTEM: ${client} クライアントで試行中...`);
            try {
                const tempInfo = await yt.getInfo(videoId, client);
                if (tempInfo.streaming_data) {
                    info = tempInfo; // 成功したらこれを使う！
                    console.log(`SUCCESS: ${client} でストリーミングデータを発見！`);
                    break; 
                }
            } catch (err) {
                console.log(`WARNING: ${client} での取得に失敗: ${err.message}`);
            }
        }

        if (!info || !info.streaming_data) {
            throw new Error("どのデバイス（Android, TV, iOS, Web）でも動画データが見つかりませんでした。");
        }

        // 4. フォーマット選択
        // ※ info は成功したデバイスのデータに置き換わっているので安心！
        const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
        
        if (!format) {
            throw new Error("適切な動画形式が見つかりませんでした。");
        }

        const directUrl = format.url;
        console.log(`directUrl: ${directUrl}`);

        // 5. レスポンス
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json({
            success: true,
            client: info.client_name, // どのデバイスで成功したか一応返す
            title: info.basic_info.title,
            url: directUrl
        });

    } catch (e) {
        console.error("ERROR:", e.message);
        res.status(500).json({ 
            error: e.message, 
            detail: "動画が非公開か、地域制限、あるいはボット対策に阻まれた可能性があります。" 
        });
    }
}

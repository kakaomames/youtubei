import { Innertube } from 'youtubei.js'; // これだけで本家から呼び出せる！

export default async function handler(req, res) {
    const { videoId } = req.query;
    console.log(`videoId: ${videoId}`); // 決まった値をプリント！

    try {
        const yt = await Innertube.create();
        const info = await yt.getInfo(videoId);
        const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
        
        console.log(`URL発見！: ${format.url}`); // プリント！

        res.setHeader('Access-Control-Allow-Origin', '*'); // HTMLから呼べるようにする
        res.status(200).json({ url: format.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

import { fetchListeningHistory } from '../services/spotify.service';
import { saveListeningHistory } from '../models/history.model';
import type { Request, Response} from 'express';

export const getListeningHistory = async (user: any) => {
    try {
        const history = await fetchListeningHistory(user);
        await Promise.all(
            history.map((item: any) =>
                saveListeningHistory(
                    user.id,
                    item.trackId,
                    item.playedAt,
                    item.trackName,
                    item.artistName,
                    item.albumName,
                    item.durationMs,
                    'get_recently_played',
                    {}
                )
            )
        );
        return history
    } catch {

    }
}

export const updateListeningHistory = async () => {

}
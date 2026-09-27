import { useEffect, useState } from 'react';

export function useResource(loader, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError('');
        loader()
            .then((value) => {
                if (alive) setData(value);
            })
            .catch((err) => {
                if (alive) setError(err.message);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, deps);

    return { data, setData, loading, error, reload: () => loader().then(setData) };
}

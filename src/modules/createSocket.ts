interface ChallengeData {
    readonly algorithm: string;
    readonly challenge: string;
    readonly maxnumber: number;
    readonly salt: string;
    readonly signature: string;
}

interface WorkerResult {
    readonly number: number;
    readonly took: string;
}

class Altcha {
    private readonly coreCount = Math.min(16, navigator.hardwareConcurrency || 8);
    private readonly workers: Worker[] = [];
    private blobUrl: string | null = null;

    private initPool(challenge: string, salt: string) {
        if (this.workers.length > 0) return;

        const sha256Code = atob(`IWZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2Z1bmN0aW9uIHQodCxpKXtpPyhkWzBdPWRbMTZdPWRbMV09ZFsyXT1kWzNdPWRbNF09ZFs1XT1kWzZdPWRbN109ZFs4XT1kWzldPWRbMTBdPWRbMTFdPWRbMTJdPWRbMTNdPWRbMTRdPWRbMTVdPTAsdGhpcy5ibG9ja3M9ZCk6dGhpcy5ibG9ja3M9WzAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF0sdD8odGhpcy5oMD0zMjM4MzcxMDMyLHRoaXMuaDE9OTE0MTUwNjYzLHRoaXMuaDI9ODEyNzAyOTk5LHRoaXMuaDM9NDE0NDkxMjY5Nyx0aGlzLmg0PTQyOTA3NzU4NTcsdGhpcy5oNT0xNzUwNjAzMDI1LHRoaXMuaDY9MTY5NDA3NjgzOSx0aGlzLmg3PTMyMDQwNzU0MjgpOih0aGlzLmgwPTE3NzkwMzM3MDMsdGhpcy5oMT0zMTQ0MTM0Mjc3LHRoaXMuaDI9MTAxMzkwNDI0Mix0aGlzLmgzPTI3NzM0ODA3NjIsdGhpcy5oND0xMzU5ODkzMTE5LHRoaXMuaDU9MjYwMDgyMjkyNCx0aGlzLmg2PTUyODczNDYzNSx0aGlzLmg3PTE1NDE0NTkyMjUpLHRoaXMuYmxvY2s9dGhpcy5zdGFydD10aGlzLmJ5dGVzPXRoaXMuaEJ5dGVzPTAsdGhpcy5maW5hbGl6ZWQ9dGhpcy5oYXNoZWQ9ITEsdGhpcy5maXJzdD0hMCx0aGlzLmlzMjI0PXR9ZnVuY3Rpb24gaShpLHIscyl7dmFyIGUsbj10eXBlb2YgaTtpZigic3RyaW5nIj09PW4pe3ZhciBvLGE9W10sdT1pLmxlbmd0aCxjPTA7Zm9yKGU9MDtlPHU7KytlKShvPWkuY2hhckNvZGVBdChlKSk8MTI4P2FbYysrXT1vOm88MjA0OD8oYVtjKytdPTE5MnxvPj42LGFbYysrXT0xMjh8NjMmbyk6bzw1NTI5Nnx8bz49NTczNDQ/KGFbYysrXT0yMjR8bz4+MTIsYVtjKytdPTEyOHxvPj42JjYzLGFbYysrXT0xMjh8NjMmbyk6KG89NjU1MzYrKCgxMDIzJm8pPDwxMHwxMDIzJmkuY2hhckNvZGVBdCgrK2UpKSxhW2MrK109MjQwfG8+PjE4LGFbYysrXT0xMjh8bz4+MTImNjMsYVtjKytdPTEyOHxvPj42JjYzLGFbYysrXT0xMjh8NjMmbyk7aT1hfWVsc2V7aWYoIm9iamVjdCIhPT1uKXRocm93IG5ldyBFcnJvcihoKTtpZihudWxsPT09aSl0aHJvdyBuZXcgRXJyb3IoaCk7aWYoZiYmaS5jb25zdHJ1Y3Rvcj09PUFycmF5QnVmZmVyKWk9bmV3IFVpbnQ4QXJyYXkoaSk7ZWxzZSBpZighKEFycmF5LmlzQXJyYXkoaSl8fGYmJkFycmF5QnVmZmVyLmlzVmlldyhpKSkpdGhyb3cgbmV3IEVycm9yKGgpfWkubGVuZ3RoPjY0JiYoaT1uZXcgdChyLCEwKS51cGRhdGUoaSkuYXJyYXkoKSk7dmFyIHk9W10scD1bXTtmb3IoZT0wO2U8NjQ7KytlKXt2YXIgbD1pW2VdfHwwO3lbZV09OTJebCxwW2VdPTU0Xmx9dC5jYWxsKHRoaXMscixzKSx0aGlzLnVwZGF0ZShwKSx0aGlzLm9LZXlQYWQ9eSx0aGlzLmlubmVyPSEwLHRoaXMuc2hhcmVkTWVtb3J5PXN9dmFyIGg9ImlucHV0IGlzIGludmFsaWQgdHlwZSIscj0ib2JqZWN0Ij09dHlwZW9mIHdpbmRvdyxzPXI/d2luZG93Ont9O3MuSlNfU0hBMjU2X05PX1dJTkRPVyYmKHI9ITEpO3ZhciBlPSFyJiYib2JqZWN0Ij09dHlwZW9mIHNlbGYsbj0hcy5KU19TSEEyNTZfTk9fTk9ERV9KUyYmIm9iamVjdCI9PXR5cGVvZiBwcm9jZXNzJiZwcm9jZXNzLnZlcnNpb25zJiZwcm9jZXNzLnZlcnNpb25zLm5vZGU7bj9zPWdsb2JhbDplJiYocz1zZWxmKTt2YXIgbz0hcy5KU19TSEEyNTZfTk9fQ09NTU9OX0pTJiYib2JqZWN0Ij09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMsYT0iZnVuY3Rpb24iPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kLGY9IXMuSlNfU0hBMjU2X05PX0FSUkFZX0JVRkZFUiYmInVuZGVmaW5lZCIhPXR5cGVvZiBBcnJheUJ1ZmZlcix1PSIwMTIzNDU2Nzg5YWJjZGVmIi5zcGxpdCgiIiksYz1bLTIxNDc0ODM2NDgsODM4ODYwOCwzMjc2OCwxMjhdLHk9WzI0LDE2LDgsMF0scD1bMTExNjM1MjQwOCwxODk5NDQ3NDQxLDMwNDkzMjM0NzEsMzkyMTAwOTU3Myw5NjE5ODcxNjMsMTUwODk3MDk5MywyNDUzNjM1NzQ4LDI4NzA3NjMyMjEsMzYyNDM4MTA4MCwzMTA1OTg0MDEsNjA3MjI1Mjc4LDE0MjY4ODE5ODcsMTkyNTA3ODM4OCwyMTYyMDc4MjA2LDI2MTQ4ODgxMDMsMzI0ODIyMjU4MCwzODM1MzkwNDAxLDQwMjIyMjQ3NzQsMjY0MzQ3MDc4LDYwNDgwNzYyOCw3NzAyNTU5ODMsMTI0OTE1MDEyMiwxNTU1MDgxNjkyLDE5OTYwNjQ5ODYsMjU1NDIyMDg4MiwyODIxODM0MzQ5LDI5NTI5OTY4MDgsMzIxMDMxMzY3MSwzMzM2NTcxODkxLDM1ODQ1Mjg3MTEsMTEzOTI2OTkzLDMzODI0MTg5NSw2NjYzMDcyMDUsNzczNTI5OTEyLDEyOTQ3NTczNzIsMTM5NjE4MjI5MSwxNjk1MTgzNzAwLDE5ODY2NjEwNTEsMjE3NzAyNjM1MCwyNDU2OTU2MDM3LDI3MzA0ODU5MjEsMjgyMDMwMjQxMSwzMjU5NzMwODAwLDMzNDU3NjQ3NzEsMzUxNjA2NTgxNywzNjAwMzUyODA0LDQwOTQ1NzE5MDksMjc1NDIzMzQ0LDQzMDIyNzczNCw1MDY5NDg2MTYsNjU5MDYwNTU2LDg4Mzk5Nzg3Nyw5NTgxMzk1NzEsMTMyMjgyMjIxOCwxNTM3MDAyMDYzLDE3NDc4NzM3NzksMTk1NTU2MjIyMiwyMDI0MTA0ODE1LDIyMjc3MzA0NTIsMjM2MTg1MjQyNCwyNDI4NDM2NDc0LDI3NTY3MzQxODcsMzIwNDAzMTQ3OSwzMzI5MzI1Mjk4XSxsPVsiaGV4IiwiYXJyYXkiLCJkaWdlc3QiLCJhcnJheUJ1ZmZlciJdLGQ9W107IXMuSlNfU0hBMjU2X05PX05PREVfSlMmJkFycmF5LmlzQXJyYXl8fChBcnJheS5pc0FycmF5PWZ1bmN0aW9uKHQpe3JldHVybiJbb2JqZWN0IEFycmF5XSI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodCl9KSwhZnx8IXMuSlNfU0hBMjU2X05PX0FSUkFZX0JVRkZFUl9JU19WSUVXJiZBcnJheUJ1ZmZlci5pc1ZpZXd8fChBcnJheUJ1ZmZlci5pc1ZpZXc9ZnVuY3Rpb24odCl7cmV0dXJuIm9iamVjdCI9PXR5cGVvZiB0JiZ0LmJ1ZmZlciYmdC5idWZmZXIuY29uc3RydWN0b3I9PT1BcnJheUJ1ZmZlcn0pO3ZhciBBPWZ1bmN0aW9uKGksaCl7cmV0dXJuIGZ1bmN0aW9uKHIpe3JldHVybiBuZXcgdChoLCEwKS51cGRhdGUocilbaV0oKX19LHc9ZnVuY3Rpb24oaSl7dmFyIGg9QSgiaGV4IixpKTtuJiYoaD1iKGgsaSkpLGguY3JlYXRlPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyB0KGkpfSxoLnVwZGF0ZT1mdW5jdGlvbih0KXtyZXR1cm4gaC5jcmVhdGUoKS51cGRhdGUodCl9O2Zvcih2YXIgcj0wO3I8bC5sZW5ndGg7KytyKXt2YXIgcz1sW3JdO2hbc109QShzLGkpfXJldHVybiBofSxiPWZ1bmN0aW9uKHQsaSl7dmFyIHI9ZXZhbCgicmVxdWlyZSgnY3J5cHRvJykiKSxzPWV2YWwoInJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlciIpLGU9aT8ic2hhMjI0Ijoic2hhMjU2IixuPWZ1bmN0aW9uKGkpe2lmKCJzdHJpbmciPT10eXBlb2YgaSlyZXR1cm4gci5jcmVhdGVIYXNoKGUpLnVwZGF0ZShpLCJ1dGY4IikuZGlnZXN0KCJoZXgiKTtpZihudWxsPT09aXx8dm9pZCAwPT09aSl0aHJvdyBuZXcgRXJyb3IoaCk7cmV0dXJuIGkuY29uc3RydWN0b3I9PT1BcnJheUJ1ZmZlciYmKGk9bmV3IFVpbnQ4QXJyYXkoaSkpLEFycmF5LmlzQXJyYXkoaSl8fEFycmF5QnVmZmVyLmlzVmlldyhpKXx8aS5jb25zdHJ1Y3Rvcj09PXM/ci5jcmVhdGVIYXNoKGUpLnVwZGF0ZShuZXcgcyhpKSkuZGlnZXN0KCJoZXgiKTp0KGkpfTtyZXR1cm4gbn0sdj1mdW5jdGlvbih0LGgpe3JldHVybiBmdW5jdGlvbihyLHMpe3JldHVybiBuZXcgaShyLGgsITApLnVwZGF0ZShzKVt0XSgpfX0sXz1mdW5jdGlvbih0KXt2YXIgaD12KCJoZXgiLHQpO2guY3JlYXRlPWZ1bmN0aW9uKGgpe3JldHVybiBuZXcgaShoLHQpfSxoLnVwZGF0ZT1mdW5jdGlvbih0LGkpe3JldHVybiBoLmNyZWF0ZSh0KS51cGRhdGUoaSl9O2Zvcih2YXIgcj0wO3I8bC5sZW5ndGg7KytyKXt2YXIgcz1sW3JdO2hbc109dihzLHQpfXJldHVybiBofTt0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCl7aWYoIXRoaXMuZmluYWxpemVkKXt2YXIgaSxyPXR5cGVvZiB0O2lmKCJzdHJpbmciIT09cil7aWYoIm9iamVjdCIhPT1yKXRocm93IG5ldyBFcnJvcihoKTtpZihudWxsPT09dCl0aHJvdyBuZXcgRXJyb3IoaCk7aWYoZiYmdC5jb25zdHJ1Y3Rvcj09PUFycmF5QnVmZmVyKXQ9bmV3IFVpbnQ4QXJyYXkodCk7ZWxzZSBpZighKEFycmF5LmlzQXJyYXkodCl8fGYmJkFycmF5QnVmZmVyLmlzVmlldyh0KSkpdGhyb3cgbmV3IEVycm9yKGgpO2k9ITB9Zm9yKHZhciBzLGUsbj0wLG89dC5sZW5ndGgsYT10aGlzLmJsb2NrcztuPG87KXtpZih0aGlzLmhhc2hlZCYmKHRoaXMuaGFzaGVkPSExLGFbMF09dGhpcy5ibG9jayxhWzE2XT1hWzFdPWFbMl09YVszXT1hWzRdPWFbNV09YVs2XT1hWzddPWFbOF09YVs5XT1hWzEwXT1hWzExXT1hWzEyXT1hWzEzXT1hWzE0XT1hWzE1XT0wKSxpKWZvcihlPXRoaXMuc3RhcnQ7bjxvJiZlPDY0OysrbilhW2U+PjJdfD10W25dPDx5WzMmZSsrXTtlbHNlIGZvcihlPXRoaXMuc3RhcnQ7bjxvJiZlPDY0Oysrbikocz10LmNoYXJDb2RlQXQobikpPDEyOD9hW2U+PjJdfD1zPDx5WzMmZSsrXTpzPDIwNDg/KGFbZT4+Ml18PSgxOTJ8cz4+Nik8PHlbMyZlKytdLGFbZT4+Ml18PSgxMjh8NjMmcyk8PHlbMyZlKytdKTpzPDU1Mjk2fHxzPj01NzM0ND8oYVtlPj4yXXw9KDIyNHxzPj4xMik8PHlbMyZlKytdLGFbZT4+Ml18PSgxMjh8cz4+NiY2Myk8PHlbMyZlKytdLGFbZT4+Ml18PSgxMjh8NjMmcyk8PHlbMyZlKytdKToocz02NTUzNisoKDEwMjMmcyk8PDEwfDEwMjMmdC5jaGFyQ29kZUF0KCsrbikpLGFbZT4+Ml18PSgyNDB8cz4+MTgpPDx5WzMmZSsrXSxhW2U+PjJdfD0oMTI4fHM+PjEyJjYzKTw8eVszJmUrK10sYVtlPj4yXXw9KDEyOHxzPj42JjYzKTw8eVszJmUrK10sYVtlPj4yXXw9KDEyOHw2MyZzKTw8eVszJmUrK10pO3RoaXMubGFzdEJ5dGVJbmRleD1lLHRoaXMuYnl0ZXMrPWUtdGhpcy5zdGFydCxlPj02ND8odGhpcy5ibG9jaz1hWzE2XSx0aGlzLnN0YXJ0PWUtNjQsdGhpcy5oYXNoKCksdGhpcy5oYXNoZWQ9ITApOnRoaXMuc3RhcnQ9ZX1yZXR1cm4gdGhpcy5ieXRlcz40Mjk0OTY3Mjk1JiYodGhpcy5oQnl0ZXMrPXRoaXMuYnl0ZXMvNDI5NDk2NzI5Njw8MCx0aGlzLmJ5dGVzPXRoaXMuYnl0ZXMlNDI5NDk2NzI5NiksdGhpc319LHQucHJvdG90eXBlLmZpbmFsaXplPWZ1bmN0aW9uKCl7aWYoIXRoaXMuZmluYWxpemVkKXt0aGlzLmZpbmFsaXplZD0hMDt2YXIgdD10aGlzLmJsb2NrcyxpPXRoaXMubGFzdEJ5dGVJbmRleDt0WzE2XT10aGlzLmJsb2NrLHRbaT4+Ml18PWNbMyZpXSx0aGlzLmJsb2NrPXRbMTZdLGk+PTU2JiYodGhpcy5oYXNoZWR8fHRoaXMuaGFzaCgpLHRbMF09dGhpcy5ibG9jayx0WzE2XT10WzFdPXRbMl09dFszXT10WzRdPXRbNV09dFs2XT10WzddPXRbOF09dFs5XT10WzEwXT10WzExXT10WzEyXT10WzEzXT10WzE0XT10WzE1XT0wKSx0WzE0XT10aGlzLmhCeXRlczw8M3x0aGlzLmJ5dGVzPj4+MjksdFsxNV09dGhpcy5ieXRlczw8Myx0aGlzLmhhc2goKX19LHQucHJvdG90eXBlLmhhc2g9ZnVuY3Rpb24oKXt2YXIgdCxpLGgscixzLGUsbixvLGEsZj10aGlzLmgwLHU9dGhpcy5oMSxjPXRoaXMuaDIseT10aGlzLmgzLGw9dGhpcy5oNCxkPXRoaXMuaDUsQT10aGlzLmg2LHc9dGhpcy5oNyxiPXRoaXMuYmxvY2tzO2Zvcih0PTE2O3Q8NjQ7Kyt0KWk9KChzPWJbdC0xNV0pPj4+N3xzPDwyNSleKHM+Pj4xOHxzPDwxNClecz4+PjMsaD0oKHM9Ylt0LTJdKT4+PjE3fHM8PDE1KV4ocz4+PjE5fHM8PDEzKV5zPj4+MTAsYlt0XT1iW3QtMTZdK2krYlt0LTddK2g8PDA7Zm9yKGE9dSZjLHQ9MDt0PDY0O3QrPTQpdGhpcy5maXJzdD8odGhpcy5pczIyND8oZT0zMDAwMzIsdz0ocz1iWzBdLTE0MTMyNTc4MTkpLTE1MDA1NDU5OTw8MCx5PXMrMjQxNzcwNzc8PDApOihlPTcwNDc1MTEwOSx3PShzPWJbMF0tMjEwMjQ0MjQ4KS0xNTIxNDg2NTM0PDwwLHk9cysxNDM2OTQ1NjU8PDApLHRoaXMuZmlyc3Q9ITEpOihpPShmPj4+MnxmPDwzMCleKGY+Pj4xM3xmPDwxOSleKGY+Pj4yMnxmPDwxMCkscj0oZT1mJnUpXmYmY15hLHc9eSsocz13KyhoPShsPj4+NnxsPDwyNileKGw+Pj4xMXxsPDwyMSleKGw+Pj4yNXxsPDw3KSkrKGwmZF5+bCZBKStwW3RdK2JbdF0pPDwwLHk9cysoaStyKTw8MCksaT0oeT4+PjJ8eTw8MzApXih5Pj4+MTN8eTw8MTkpXih5Pj4+MjJ8eTw8MTApLHI9KG49eSZmKV55JnVeZSxBPWMrKHM9QSsoaD0odz4+PjZ8dzw8MjYpXih3Pj4+MTF8dzw8MjEpXih3Pj4+MjV8dzw8NykpKyh3JmxefncmZCkrcFt0KzFdK2JbdCsxXSk8PDAsaT0oKGM9cysoaStyKTw8MCk+Pj4yfGM8PDMwKV4oYz4+PjEzfGM8PDE5KV4oYz4+PjIyfGM8PDEwKSxyPShvPWMmeSleYyZmXm4sZD11KyhzPWQrKGg9KEE+Pj42fEE8PDI2KV4oQT4+PjExfEE8PDIxKV4oQT4+PjI1fEE8PDcpKSsoQSZ3Xn5BJmwpK3BbdCsyXStiW3QrMl0pPDwwLGk9KCh1PXMrKGkrcik8PDApPj4+Mnx1PDwzMCleKHU+Pj4xM3x1PDwxOSleKHU+Pj4yMnx1PDwxMCkscj0oYT11JmMpXnUmeV5vLGw9Zisocz1sKyhoPShkPj4+NnxkPDwyNileKGQ+Pj4xMXxkPDwyMSleKGQ+Pj4yNXxkPDw3KSkrKGQmQV5+ZCZ3KStwW3QrM10rYlt0KzNdKTw8MCxmPXMrKGkrcik8PDA7dGhpcy5oMD10aGlzLmgwK2Y8PDAsdGhpcy5oMT10aGlzLmgxK3U8PDAsdGhpcy5oMj10aGlzLmgyK2M8PDAsdGhpcy5oMz10aGlzLmgzK3k8PDAsdGhpcy5oND10aGlzLmg0K2w8PDAsdGhpcy5oNT10aGlzLmg1K2Q8PDAsdGhpcy5oNj10aGlzLmg2K0E8PDAsdGhpcy5oNz10aGlzLmg3K3c8PDB9LHQucHJvdG90eXBlLmhleD1mdW5jdGlvbigpe3RoaXMuZmluYWxpemUoKTt2YXIgdD10aGlzLmgwLGk9dGhpcy5oMSxoPXRoaXMuaDIscj10aGlzLmgzLHM9dGhpcy5oNCxlPXRoaXMuaDUsbj10aGlzLmg2LG89dGhpcy5oNyxhPXVbdD4+MjgmMTVdK3VbdD4+MjQmMTVdK3VbdD4+MjAmMTVdK3VbdD4+MTYmMTVdK3VbdD4+MTImMTVdK3VbdD4+OCYxNV0rdVt0Pj40JjE1XSt1WzE1JnRdK3VbaT4+MjgmMTVdK3VbaT4+MjQmMTVdK3VbaT4+MjAmMTVdK3VbaT4+MTYmMTVdK3VbaT4+MTImMTVdK3VbaT4+OCYxNV0rdVtpPj40JjE1XSt1WzE1JmldK3VbaD4+MjgmMTVdK3VbaD4+MjQmMTVdK3VbaD4+MjAmMTVdK3VbaD4+MTYmMTVdK3VbaD4+MTImMTVdK3VbaD4+OCYxNV0rdVtoPj40JjE1XSt1WzE1JmhdK3Vbcj4+MjgmMTVdK3Vbcj4+MjQmMTVdK3Vbcj4+MjAmMTVdK3Vbcj4+MTYmMTVdK3Vbcj4+MTImMTVdK3Vbcj4+OCYxNV0rdVtyPj40JjE1XSt1WzE1JnJdK3Vbcz4+MjgmMTVdK3Vbcz4+MjQmMTVdK3Vbcz4+MjAmMTVdK3Vbcz4+MTYmMTVdK3Vbcz4+MTImMTVdK3Vbcz4+OCYxNV0rdVtzPj40JjE1XSt1WzE1JnNdK3VbZT4+MjgmMTVdK3VbZT4+MjQmMTVdK3VbZT4+MjAmMTVdK3VbZT4+MTYmMTVdK3VbZT4+MTImMTVdK3VbZT4+OCYxNV0rdVtlPj40JjE1XSt1WzE1JmVdK3Vbbj4+MjgmMTVdK3Vbbj4+MjQmMTVdK3Vbbj4+MjAmMTVdK3Vbbj4+MTYmMTVdK3Vbbj4+MTImMTVdK3Vbbj4+OCYxNV0rdVtuPj40JjE1XSt1WzE1Jm5dO3JldHVybiB0aGlzLmlzMjI0fHwoYSs9dVtvPj4yOCYxNV0rdVtvPj4yNCYxNV0rdVtvPj4yMCYxNV0rdVtvPj4xNiYxNV0rdVtvPj4xMiYxNV0rdVtvPj44JjE1XSt1W28+PjQmMTVdK3VbMTUmb10pLGF9LHQucHJvdG90eXBlLnRvU3RyaW5nPXQucHJvdG90eXBlLmhleCx0LnByb3RvdHlwZS5kaWdlc3Q9ZnVuY3Rpb24oKXt0aGlzLmZpbmFsaXplKCk7dmFyIHQ9dGhpcy5oMCxpPXRoaXMuaDEsaD10aGlzLmgyLHI9dGhpcy5oMyxzPXRoaXMuaDQsZT10aGlzLmg1LG49dGhpcy5oNixvPXRoaXMuaDcsYT1bdD4+MjQmMjU1LHQ+PjE2JjI1NSx0Pj44JjI1NSwyNTUmdCxpPj4yNCYyNTUsaT4+MTYmMjU1LGk+PjgmMjU1LDI1NSZpLGg+PjI0JjI1NSxoPj4xNiYyNTUsaD4+OCYyNTUsMjU1Jmgscj4+MjQmMjU1LHI+PjE2JjI1NSxyPj44JjI1NSwyNTUmcixzPj4yNCYyNTUscz4+MTYmMjU1LHM+PjgmMjU1LDI1NSZzLGU+PjI0JjI1NSxlPj4xNiYyNTUsZT4+OCYyNTUsMjU1JmUsbj4+MjQmMjU1LG4+PjE2JjI1NSxuPj44JjI1NSwyNTUmbl07cmV0dXJuIHRoaXMuaXMyMjR8fGEucHVzaChvPj4yNCYyNTUsbz4+MTYmMjU1LG8+PjgmMjU1LDI1NSZvKSxhfSx0LnByb3RvdHlwZS5hcnJheT10LnByb3RvdHlwZS5kaWdlc3QsdC5wcm90b3R5cGUuYXJyYXlCdWZmZXI9ZnVuY3Rpb24oKXt0aGlzLmZpbmFsaXplKCk7dmFyIHQ9bmV3IEFycmF5QnVmZmVyKHRoaXMuaXMyMjQ/Mjg6MzIpLGk9bmV3IERhdGFWaWV3KHQpO3JldHVybiBpLnNldFVpbnQzMigwLHRoaXMuaDApLGkuc2V0VWludDMyKDQsdGhpcy5oMSksaS5zZXRVaW50MzIoOCx0aGlzLmgyKSxpLnNldFVpbnQzMigxMix0aGlzLmgzKSxpLnNldFVpbnQzMigxNix0aGlzLmg0KSxpLnNldFVpbnQzMigyMCx0aGlzLmg1KSxpLnNldFVpbnQzMigyNCx0aGlzLmg2KSx0aGlzLmlzMjI0fHxpLnNldFVpbnQzMigyOCx0aGlzLmg3KSx0fSxpLnByb3RvdHlwZT1uZXcgdCxpLnByb3RvdHlwZS5maW5hbGl6ZT1mdW5jdGlvbigpe2lmKHQucHJvdG90eXBlLmZpbmFsaXplLmNhbGwodGhpcyksdGhpcy5pbm5lcil7dGhpcy5pbm5lcj0hMTt2YXIgaT10aGlzLmFycmF5KCk7dC5jYWxsKHRoaXMsdGhpcy5pczIyNCx0aGlzLnNoYXJlZE1lbW9yeSksdGhpcy51cGRhdGUodGhpcy5vS2V5UGFkKSx0aGlzLnVwZGF0ZShpKSx0LnByb3RvdHlwZS5maW5hbGl6ZS5jYWxsKHRoaXMpfX07dmFyIEI9dygpO0Iuc2hhMjU2PUIsQi5zaGEyMjQ9dyghMCksQi5zaGEyNTYuaG1hYz1fKCksQi5zaGEyMjQuaG1hYz1fKCEwKSxvP21vZHVsZS5leHBvcnRzPUI6KHMuc2hhMjU2PUIuc2hhMjU2LHMuc2hhMjI0PUIuc2hhMjI0LGEmJmRlZmluZShmdW5jdGlvbigpe3JldHVybiBCfSkpfSgpOw==`);
        const workerCode = `
            ${sha256Code}
            // let challenge = null, salt = null;
            self.onmessage = e => {
                const d = e.data;
                if (d.init) { challenge = d.challenge; salt = d.salt; return; }
                const { start, end } = d;
                for (let i = start; i <= end; i++) {
                    if (sha256(salt + i) === challenge) {
                        postMessage(i);
                        return;
                    }
                }
                postMessage(null);
            };
        `;
        this.blobUrl = URL.createObjectURL(new Blob([workerCode], { type: "application/javascript" }));
        for (let i = 0; i < this.coreCount; i++) {
            this.workers.push(new Worker(this.blobUrl));
            this.workers[i]!.postMessage({ init: true, challenge, salt });
        }
    }

    private async getChallenge(): Promise<ChallengeData> {
        const res = await fetch("https://api.moomoo.io/verify");
        return res.json();
    }

    private async solve(chal: ChallengeData) {
        const { challenge, salt, maxnumber } = chal;
        this.initPool(challenge, salt);
        const segSize = Math.ceil(maxnumber / this.coreCount);

        return new Promise<WorkerResult>((resolve, reject) => {
            let solved = false, done = 0;
            const startTime = performance.now();

            this.workers.forEach((worker, idx) => {
                const s = idx * segSize;
                const e = Math.min(maxnumber, (idx + 1) * segSize - 1);

                worker.onmessage = (msg) => {
                    if (solved) return;
                    const number = msg.data;
                    if (number !== null) {
                        solved = true;
                        const took = ((performance.now() - startTime) / 1000).toFixed(2);
                        resolve({ number, took });
                        this.cleanup();
                    } else {
                        done++;
                        if (!solved && done === this.coreCount) {
                            reject(new Error("Not solved"));
                            this.cleanup();
                        }
                    }
                };
                worker.onerror = err => { if (!solved) reject(err); this.cleanup(); };
                worker.postMessage({ start: s, end: e });
            });
        });
    }

    private cleanup() {
        this.workers.forEach(w => w.terminate());
        this.workers.length = 0;

        if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
    }

    private static makePayload(chal: ChallengeData, result: WorkerResult) {
        return btoa(JSON.stringify({
            algorithm: "SHA-256",
            challenge: chal.challenge,
            salt: chal.salt,
            signature: chal.signature || null,
            number: result.number,
            took: result.took
        }));
    }

    async generate() {
        const chal = await this.getChallenge();
        const sol = await this.solve(chal);
        return `alt:${Altcha.makePayload(chal, sol)}`;
    }
}

export const altcha = new Altcha();
const createSocket = async (href: string) => {
    let url = href;
    if (/moomoo/.test(href)) {
        const token = await altcha.generate();
        const origin = new URL(href).origin;
        url = origin + "/?token=" + token;
    }
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    return ws;
}

export default createSocket;
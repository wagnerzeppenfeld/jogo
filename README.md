# Desafio Aluno Espetacular

Projeto acadêmico de ADS: plataforma educativa gamificada para crianças do ensino fundamental, com tema de aventura espacial e desafios de memória, lógica e matemática.

## Como executar

Não precisa de Node, servidor nem instalação. Basta abrir o `index.html` no navegador.

## Como os dados são guardados

Cadastro, login, pontuação, XP, moedas e ranking ficam no `localStorage` do navegador (arquivo `js/local-api.js`). Por isso:

- cada navegador/computador tem seus próprios usuários e ranking;
- limpar os dados do navegador apaga o progresso;
- a senha usa um hash simples, só para fins didáticos.

## Organização

```text
desafio_aluno_espetacular/
├── index.html
├── css/style.css
├── js/
│   ├── local-api.js   (substitui o antigo server.js)
│   └── app.js
└── README.md
```

## Modalidades e avatar

- Missões: Templo das Memórias, Planeta dos Padrões, Estação dos Números, **Caça-Pares**, **Quiz Cósmico** e **Corrida Relâmpago** (`js/extras.js`).
- **Avatar:** na aba "Avatar", o jogador escolhe personagem, acessório e cor de fundo. Itens com 🪙 são comprados com as moedas ganhas nas missões.

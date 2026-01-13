# Top Active WhatsApp 2.0 - Frontend

Frontend React para automação de WhatsApp.

## 🚀 Como rodar

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

### Rodar frontend + backend juntos
```bash
npm run dev:full
```

## 📁 Estrutura

```
frontend/
├── src/
│   ├── components/      # Componentes React
│   │   ├── ui/         # Componentes UI básicos
│   │   ├── Navbar.jsx  # Barra de navegação superior
│   │   └── Sidebar.jsx # Menu lateral
│   ├── pages/          # Páginas da aplicação
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Messages.jsx
│   │   └── Profile.jsx
│   ├── hooks/          # Hooks customizados
│   │   └── useAuth.js  # Hook de autenticação
│   ├── lib/            # Bibliotecas/configurações
│   │   └── axios.js    # Cliente HTTP configurado
│   ├── App.jsx         # Componente principal
│   └── main.jsx        # Entry point
├── tailwind.config.js  # Configuração TailwindCSS
└── vite.config.js      # Configuração Vite
```

## 🎨 Tecnologias

- **React 19** - Framework UI
- **Vite** - Build tool
- **TailwindCSS** - Estilização
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **React Hot Toast** - Notificações
- **Lucide React** - Ícones

## 🔐 Autenticação

A autenticação é feita via JWT armazenado no `localStorage`. O token é automaticamente incluído em todas as requisições via interceptor do Axios.

## 🌙 Dark Mode

Dark mode pode ser alternado pelo botão na Navbar. A preferência é salva no localStorage.

## 📱 Responsividade

O frontend é totalmente responsivo:
- **Mobile**: Sidebar como overlay (hamburger menu)
- **Tablet**: Sidebar colapsável
- **Desktop**: Sidebar fixa lateral

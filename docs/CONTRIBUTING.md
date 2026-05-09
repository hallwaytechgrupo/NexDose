# Guia de Documentação Técnica

## 📋 Visão Geral

Esta branch contém toda a documentação arquitetural do projeto NexDose em formato Mermaid com imagens PNG.

## 📁 Estrutura

```
docs/
├── README.md                    # Índice da documentação
└── diagrams/
    ├── class-diagram.md         # Diagrama de Classes (com imagem PNG)
    ├── class-diagram.png        # Imagem renderizada
    ├── use-case-diagram.md      # Diagrama de Casos de Uso (com imagem PNG)
    ├── use-case-diagram.png     # Imagem renderizada
    ├── sequence-diagram.md      # Diagrama de Sequência (com imagem PNG)
    └── sequence-diagram.png     # Imagem renderizada
```

## 🎨 Visualizando os Diagramas

### No GitHub
- As imagens PNG aparecem automaticamente nos arquivos `.md`
- O código Mermaid também é renderizado pelo GitHub

### No VS Code
- Para ver as imagens: abra qualquer arquivo `.md` em preview
- Para ver o código Mermaid renderizado: instale a extensão "Markdown Preview Mermaid Support"

### Online
- Acesse [mermaid.live](https://mermaid.live) e cole o código dos arquivos `.md`

## 🔄 Atualizando os Diagramas

### Opção 1: Usando o Script (Recomendado)

Se modificar o código Mermaid em qualquer arquivo `.md`:

```bash
# 1. Edite o arquivo .md desejado
# 2. Execute o script para gerar novas imagens PNG
node generate-diagrams.js

# 3. Commit as mudanças
git add docs/
git commit -m "docs: atualizar diagrama XYZ"
```

### Opção 2: Manual via mermaid.live

1. Acesse [mermaid.live](https://mermaid.live)
2. Cole o código do diagrama
3. Exporte como PNG clicando em "Download"
4. Salve em `docs/diagrams/nome-do-diagrama.png`
5. Atualize o arquivo `.md` correspondente

## 📝 Adicionando Novos Diagramas

1. Crie um novo arquivo em `docs/diagrams/novo-diagrama.md`
2. Adicione o título e visualização:
```markdown
# Seu Novo Diagrama

## 📊 Visualização

![Descrição](./novo-diagrama.png)

## 📝 Código Mermaid

\`\`\`mermaid
[seu código aqui]
\`\`\`
```

3. Se usar o script: atualize `generate-diagrams.js` e rode `node generate-diagrams.js`
4. Se for manual: exporte a imagem PNG do mermaid.live e coloque em `docs/diagrams/`
5. Commit com: `git add docs/ && git commit -m "docs: adicionar novo diagrama XYZ"`

## 🔗 Integrando com a Branch Principal

Para mesclar a documentação na `main`:

```bash
# Na branch docs
git push origin docs

# No GitHub, crie um Pull Request de docs → main
# ou faça localmente:
git checkout main
git merge docs
```

## 📚 Referências

- [Documentação Mermaid](https://mermaid.js.org)
- [Mermaid Live Editor](https://mermaid.live)
- [GitHub Mermaid Support](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)

---

**Última atualização:** Maio 2026
**Mantido por:** Equipe de Desenvolvimento NexDose

# Clara — Painel de acompanhamento

SPA em HTML, CSS e JavaScript para uma recepção organizar interessados, acompanhar etapas e visualizar retornos pendentes. Marca fictícia e dados de demonstração. MVP de Desenvolvimento Full Stack Básico.

## Abrir

1. Inicie a API Clara conforme o README do backend, em `http://127.0.0.1:5001`.
2. Abra **`index.html` diretamente no navegador**, com duplo clique ou arrastando o arquivo para uma janela do navegador.
3. Opcionalmente execute a carga fictícia no backend para visualizar seis exemplos.

A interface abre com a API desligada e informa a indisponibilidade. Os cadastros dependem da API; depois de ligá-la, clique em **Atualizar lista**. Não há armazenamento offline.

Se mudar a porta da API, ajuste a constante `API` no começo de `app.js`. A configuração padrão é `http://127.0.0.1:5001`.

## Fluxo

1. **Novo interessado**: informe nome, serviço, origem, etapa e próximo retorno.
2. **Abrir acompanhamento**: consulta o cadastro atual na API e abre seus detalhes.
3. **Salvar alterações**: atualiza os dados e a etapa.
4. **Excluir cadastro**: pede confirmação e só remove após a resposta da API.
5. Use busca por nome/serviço e filtros de etapa e retorno para organizar o trabalho.

| Ação | Operação da API |
|---|---|
| Abrir/atualizar lista | GET `/interessados` |
| Novo interessado | POST `/interessados` |
| Abrir acompanhamento | GET `/interessados/{identificador}` |
| Salvar alterações | PUT `/interessados/{identificador}` |
| Excluir | DELETE `/interessados/{identificador}` |

Busca, filtros, ordenação e contadores são calculados no navegador sobre a listagem recebida. Os contadores resumem **todos os registros carregados**, independentemente dos filtros. Retornos atrasados e de hoje consideram apenas etapas ativas. “Próximos dias” inclui todas as datas futuras. Datas usam o dia local do navegador.

Cadastros ativos exigem próximo retorno; convertidos e encerrados não contam como pendentes. A etapa “Avaliação marcada” registra o acompanhamento comercial e não é uma reserva de agenda.

## Diferenciais e comportamento

- Identidade visual própria, cards e adaptação para telas pequenas.
- Edição do acompanhamento, datas e destaque de atrasos.
- Busca sem distinção de acentos ou maiúsculas.
- Sucesso exibido somente após confirmação da API.
- Falha ao salvar mantém o formulário preenchido; falha de carregamento sinaliza possível desatualização.
- Em caso de timeout, atualize a lista antes de repetir o cadastro: a API pode ter recebido a primeira tentativa.
- Conteúdo digitado renderizado como texto, sem interpretar HTML.
- Formulário com labels, foco visível, diálogo nativo e avisos acessíveis; animações respeitam preferência por movimento reduzido.

## Arquivos

- `index.html`: estrutura da página e formulário.
- `styles.css`: identidade visual e layout responsivo.
- `app.js`: integração HTTP, formulário, estados e filtros.

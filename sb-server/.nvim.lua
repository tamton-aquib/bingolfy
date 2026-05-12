require("overseer").register_template({
  name = "Run Application",
  condition = { dir = vim.fn.getcwd() },
  builder = function()
    return { cmd = { "./mvnw" }, args = { "spring-boot:run" } }
  end,
})

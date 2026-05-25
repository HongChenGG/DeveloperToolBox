// Spring 注解速查：分类 + 搜索
(function () {
    'use strict';

    const ANNOS = [
        // ===== Web =====
        { c: 'Web', n: '@RestController', d: '组合 @Controller + @ResponseBody，类中所有方法返回 JSON', e: `@RestController\n@RequestMapping("/api/user")\npublic class UserController { ... }` },
        { c: 'Web', n: '@RequestMapping', d: 'URL 映射，支持 value/method/produces/consumes', e: `@RequestMapping(value = "/list", method = RequestMethod.GET)` },
        { c: 'Web', n: '@GetMapping', d: 'GET 简写', e: `@GetMapping("/{id}")\npublic User get(@PathVariable Long id) {}` },
        { c: 'Web', n: '@PostMapping', d: 'POST 简写', e: `@PostMapping("/create")\npublic User create(@RequestBody User user) {}` },
        { c: 'Web', n: '@PutMapping', d: 'PUT 简写（更新）', e: `@PutMapping("/{id}")` },
        { c: 'Web', n: '@DeleteMapping', d: 'DELETE 简写', e: `@DeleteMapping("/{id}")` },
        { c: 'Web', n: '@PathVariable', d: '从 URL 路径取参数', e: `@GetMapping("/{id}")\npublic User get(@PathVariable("id") Long id) {}` },
        { c: 'Web', n: '@RequestParam', d: '从 query/form 取参数', e: `@GetMapping("/list")\npublic List<User> list(@RequestParam(defaultValue="1") Integer page) {}` },
        { c: 'Web', n: '@RequestBody', d: '请求体反序列化为对象', e: `@PostMapping public User add(@RequestBody @Valid User u) {}` },
        { c: 'Web', n: '@RequestHeader', d: '取请求头', e: `public String hello(@RequestHeader("Token") String token) {}` },
        { c: 'Web', n: '@CookieValue', d: '取 Cookie', e: `public void m(@CookieValue("JSESSIONID") String sid) {}` },
        { c: 'Web', n: '@ResponseBody', d: '方法返回值直接序列化（@RestController 已含此功能）', e: `@RequestMapping("/json")\n@ResponseBody public Map data() {}` },
        { c: 'Web', n: '@CrossOrigin', d: '跨域支持', e: `@CrossOrigin(origins = "*", maxAge = 3600)\n@RestController public class ...` },
        { c: 'Web', n: '@ControllerAdvice', d: '全局异常处理 / 数据绑定', e: `@ControllerAdvice\npublic class GlobalExceptionHandler {\n  @ExceptionHandler(Exception.class)\n  public ResponseEntity<?> handle(Exception e) { ... }\n}` },
        { c: 'Web', n: '@ExceptionHandler', d: '异常处理方法', e: `@ExceptionHandler(IllegalArgumentException.class)\npublic ResponseEntity<?> handle(...) {}` },

        // ===== Bean / IoC =====
        { c: 'Bean', n: '@Component', d: '通用组件，注册到容器', e: `@Component\npublic class MyHelper {}` },
        { c: 'Bean', n: '@Service', d: '业务层组件（语义等同 @Component）', e: `@Service\npublic class UserService {}` },
        { c: 'Bean', n: '@Repository', d: 'DAO 层组件，并转换数据访问异常', e: `@Repository\npublic class UserDao {}` },
        { c: 'Bean', n: '@Controller', d: 'Web 控制器（默认返回视图）', e: `@Controller\npublic class PageController {}` },
        { c: 'Bean', n: '@Configuration', d: '配置类，可包含 @Bean 方法', e: `@Configuration\npublic class AppConfig { @Bean public ... }` },
        { c: 'Bean', n: '@Bean', d: '声明一个 Bean（在 @Configuration 类中）', e: `@Bean\npublic DataSource ds() { return ...; }` },
        { c: 'Bean', n: '@Autowired', d: '按类型自动注入', e: `@Autowired\nprivate UserService userService;` },
        { c: 'Bean', n: '@Resource', d: 'JSR-250 注入，默认按名称', e: `@Resource(name = "userService")\nprivate UserService svc;` },
        { c: 'Bean', n: '@Qualifier', d: '配合 @Autowired 指定 Bean 名称', e: `@Autowired\n@Qualifier("primaryDs")\nprivate DataSource ds;` },
        { c: 'Bean', n: '@Primary', d: '多个候选 Bean 时首选', e: `@Bean @Primary\npublic DataSource primaryDs() {}` },
        { c: 'Bean', n: '@Lazy', d: '延迟初始化', e: `@Lazy\n@Service public class HeavyService {}` },
        { c: 'Bean', n: '@Scope', d: 'Bean 作用域：singleton/prototype/request/session', e: `@Component\n@Scope("prototype")` },
        { c: 'Bean', n: '@Value', d: '注入配置值', e: `@Value("\${server.port:8080}")\nprivate int port;` },
        { c: 'Bean', n: '@PostConstruct', d: '初始化方法（依赖注入后执行）', e: `@PostConstruct\npublic void init() {}` },
        { c: 'Bean', n: '@PreDestroy', d: '销毁前回调', e: `@PreDestroy public void cleanup() {}` },

        // ===== Boot / Profile =====
        { c: 'Boot', n: '@SpringBootApplication', d: '组合 @Configuration + @EnableAutoConfiguration + @ComponentScan', e: `@SpringBootApplication\npublic class App { main(...) }` },
        { c: 'Boot', n: '@ConfigurationProperties', d: '批量绑定配置到 POJO', e: `@ConfigurationProperties(prefix = "app")\n@Component\npublic class AppProps {}` },
        { c: 'Boot', n: '@EnableAutoConfiguration', d: '启用自动配置', e: `@EnableAutoConfiguration` },
        { c: 'Boot', n: '@Profile', d: '指定环境激活', e: `@Profile("dev") @Configuration` },
        { c: 'Boot', n: '@Conditional', d: '条件装配', e: `@ConditionalOnProperty(name = "feature.x", havingValue = "true")` },

        // ===== AOP =====
        { c: 'AOP', n: '@Aspect', d: '声明切面', e: `@Aspect\n@Component\npublic class LogAspect {}` },
        { c: 'AOP', n: '@Pointcut', d: '切点定义', e: `@Pointcut("execution(* com.x.service..*.*(..))")\npublic void servicePoint() {}` },
        { c: 'AOP', n: '@Before', d: '前置通知', e: `@Before("servicePoint()")\npublic void before(JoinPoint jp) {}` },
        { c: 'AOP', n: '@After', d: '后置通知（无论是否异常）', e: `@After("servicePoint()")` },
        { c: 'AOP', n: '@AfterReturning', d: '返回后通知', e: `@AfterReturning(pointcut = "p()", returning = "ret")` },
        { c: 'AOP', n: '@AfterThrowing', d: '抛异常后通知', e: `@AfterThrowing(pointcut = "p()", throwing = "ex")` },
        { c: 'AOP', n: '@Around', d: '环绕通知（可控前后）', e: `@Around("p()")\npublic Object around(ProceedingJoinPoint pjp) throws Throwable { ... pjp.proceed(); }` },

        // ===== Transaction =====
        { c: 'TX', n: '@Transactional', d: '事务管理，rollbackFor/propagation/isolation', e: `@Transactional(rollbackFor = Exception.class,\n  propagation = Propagation.REQUIRED)\npublic void doSomething() {}` },
        { c: 'TX', n: '@EnableTransactionManagement', d: '启用事务（Boot 默认已开启）', e: `@EnableTransactionManagement\n@Configuration` },

        // ===== Validation =====
        { c: 'Valid', n: '@Valid', d: '触发参数校验', e: `public ResponseEntity<?> add(@RequestBody @Valid User u) {}` },
        { c: 'Valid', n: '@Validated', d: 'Spring 的分组校验', e: `@Validated(Create.class)` },
        { c: 'Valid', n: '@NotNull', d: '不能为 null', e: `@NotNull private String name;` },
        { c: 'Valid', n: '@NotBlank', d: '字符串不为 null 且非空白', e: `@NotBlank private String name;` },
        { c: 'Valid', n: '@Size', d: '长度/集合大小', e: `@Size(min = 2, max = 30) private String name;` },
        { c: 'Valid', n: '@Email', d: '邮箱格式', e: `@Email private String email;` },
        { c: 'Valid', n: '@Pattern', d: '正则校验', e: `@Pattern(regexp = "^1\\\\d{10}$") private String phone;` },

        // ===== Async / Schedule =====
        { c: 'Async', n: '@EnableAsync', d: '启用异步执行', e: `@EnableAsync\n@Configuration` },
        { c: 'Async', n: '@Async', d: '方法异步执行', e: `@Async\npublic Future<String> heavyTask() {}` },
        { c: 'Async', n: '@EnableScheduling', d: '启用定时任务', e: `@EnableScheduling\n@Configuration` },
        { c: 'Async', n: '@Scheduled', d: '定时任务（cron/fixedRate）', e: `@Scheduled(cron = "0 0 2 * * ?")\npublic void daily() {}` },

        // ===== Cache =====
        { c: 'Cache', n: '@EnableCaching', d: '启用缓存', e: `@EnableCaching\n@Configuration` },
        { c: 'Cache', n: '@Cacheable', d: '读取缓存', e: `@Cacheable(value = "users", key = "#id")\npublic User get(Long id) {}` },
        { c: 'Cache', n: '@CachePut', d: '更新缓存', e: `@CachePut(value = "users", key = "#u.id")` },
        { c: 'Cache', n: '@CacheEvict', d: '清除缓存', e: `@CacheEvict(value = "users", key = "#id")` },
    ];

    function init() {
        const list = document.getElementById('spring-list');
        if (!list) return;
        const search = document.getElementById('spring-search');
        const filterEl = document.getElementById('spring-filter');

        function render() {
            const kw = (search.value || '').toLowerCase().trim();
            const cat = filterEl.value;
            const filtered = ANNOS.filter(a => {
                if (cat !== 'all' && a.c !== cat) return false;
                if (!kw) return true;
                return a.n.toLowerCase().includes(kw) || a.d.toLowerCase().includes(kw);
            });
            list.innerHTML = filtered.map(a => `
                <div class="sub-card" style="margin-bottom:12px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <span style="font-weight:700;color:var(--accent-color);font-family:Consolas,monospace;font-size:15px">${a.n}</span>
                        <span class="label-chip" style="font-size:12px">${a.c}</span>
                    </div>
                    <div style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">${a.d}</div>
                    <pre style="background:var(--bg-darker);padding:10px;border-radius:8px;font-family:Consolas,monospace;font-size:13px;overflow-x:auto;margin:0;white-space:pre-wrap">${escape(a.e)}</pre>
                </div>
            `).join('') || '<div style="color:var(--text-secondary);text-align:center;padding:20px">无匹配结果</div>';
        }

        function escape(s) {
            return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        // 填充分类下拉
        const cats = ['all', ...Array.from(new Set(ANNOS.map(a => a.c)))];
        filterEl.innerHTML = cats.map(c => `<option value="${c}">${c === 'all' ? '全部分类' : c}</option>`).join('');

        search.addEventListener('input', render);
        filterEl.addEventListener('change', render);
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

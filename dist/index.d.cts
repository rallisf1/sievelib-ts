export { ActionCommand, AddflagCommand, AddressCommand, AllofCommand, AnyofCommand, ArgDefinition, BadArgument, BadValue, BodyCommand, Command, CommandError, CommandType, ControlCommand, CurrentdateCommand, DateCommand, DiscardCommand, ElseCommand, ElsifCommand, EnvelopeCommand, EnvironmentCommand, ExistsCommand, ExtensionNotLoaded, FalseCommand, FileintoCommand, HasflagCommand, HeaderCommand, IfCommand, KeepCommand, NotCommand, NotifyCommand, RedirectCommand, RejectCommand, RemoveflagCommand, RequireCommand, SetCommand, SetflagCommand, SizeCommand, StopCommand, TestCommand, TokenType, TrueCommand, UnknownCommand, VacationCommand, addCommands, add_commands, getCommandInstance, get_command_instance, loadedExtensions, parser_state, resetExtensions } from './commands.cjs';
export { Lexer, ParseError, Parser } from './parser.cjs';
export { Filter, FilterAction, FilterAlreadyExists, FilterCondition, FiltersSet } from './factory.cjs';
export { Client, Error, Response, SUPPORTED_AUTH_MECHS } from './managesieve.cjs';
export { isQuoted, quote, unquote, unquoteArg } from './tools.cjs';
import 'node:net';
import 'node:tls';
